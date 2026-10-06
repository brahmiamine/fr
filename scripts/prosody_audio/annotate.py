"""Rebuilds the rhythmic groups of the bundled recordings from the audio itself.

The groups first shipped with the recordings were guessed from punctuation:
a comma meant "the voice rises", a full stop "it falls", and the timings were
spread over the words by character count. The marking exercise scores the
learner against those groups, so a guess there teaches the ear the wrong thing.

This script replaces them with measurements:

- word timings come from `asr_words.py` (faster-whisper), aligned onto the
  excerpt's transcript so the words the learner marks never change;
- a group boundary is placed only where the speaker really pauses (silence
  measured on the intensity curve), and `pauseAfter` keeps that duration;
- the intonation of each group end is measured on the pitch curve (Praat, via
  parselmouth): the final syllable is compared with what precedes it, in
  semitones. A clear movement is kept as `rise` / `fall` / `level` with
  `intonationMeasured: true`; an unclear one stays unscored;
- `finalLengthening` marks a last word noticeably slower than the speaker's
  average.

    pip install praat-parselmouth numpy
    python3 scripts/prosody_audio/annotate.py --cache .cache/prosody-asr
"""
import argparse
import difflib
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata

import numpy as np
import parselmouth

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# A pause after a punctuated word can be short; elsewhere it must be long
# enough not to be a plosive closure.
PUNCTUATED_PAUSE = 0.08
PLAIN_PAUSE = 0.18
# Semitones between the final syllable and what precedes it. Only clear
# movements are scored: spontaneous speech is full of small, ambiguous ones.
CLEAR_MOVEMENT = 3.0
FLAT_MOVEMENT = 0.8
LENGTHENING_RATIO = 1.35
# Intensity below the loudest speech by this many dB counts as silence.
SILENCE_DB = 22
MIN_IMITATION = 5.0
MAX_IMITATION = 15.0
MIN_MATCH_RATIO = 0.8
CUE = re.compile(r'\[[^\]]*\]')
PUNCTUATION = re.compile(r'[,;:.!?…]["»)]*$')


def normalize(token: str) -> str:
    text = unicodedata.normalize('NFD', token.lower())
    text = ''.join(ch for ch in text if unicodedata.category(ch) != 'Mn')
    return re.sub(r"[^a-z0-9]", '', text)


def merge_asr_words(words):
    """Whisper splits "l'Espagne" into "l" + "'Espagne": glue them back."""
    merged = []
    for word in words:
        text = word['text'].strip()
        if not normalize(text) and not (merged and text[0] in "'’-"):
            continue
        if merged and (text[0] in "'’-" or merged[-1]['text'][-1] in "'’-"):
            merged[-1] = {
                'text': merged[-1]['text'] + text,
                'start': merged[-1]['start'],
                'end': word['end'],
            }
        else:
            merged.append({'text': text, 'start': word['start'], 'end': word['end']})
    return merged


def align(tokens, asr):
    """Times for each transcript token, from the matching ASR words."""
    left = [normalize(t) for t in tokens]
    right = [normalize(w['text']) for w in asr]
    times = [None] * len(tokens)
    matcher = difflib.SequenceMatcher(a=left, b=right, autojunk=False)
    matched = 0
    for tag, a0, a1, b0, b1 in matcher.get_opcodes():
        if tag == 'equal':
            for offset in range(a1 - a0):
                times[a0 + offset] = (asr[b0 + offset]['start'], asr[b0 + offset]['end'])
            matched += a1 - a0
        elif tag == 'replace' and a1 - a0 == b1 - b0:
            for offset in range(a1 - a0):
                times[a0 + offset] = (asr[b0 + offset]['start'], asr[b0 + offset]['end'])
            matched += (a1 - a0) * 0.5
        elif tag == 'replace' and b1 > b0:
            # Spread the ASR span over the transcript words by length.
            start, end = asr[b0]['start'], asr[b1 - 1]['end']
            weights = [len(t) + 1 for t in tokens[a0:a1]]
            total = sum(weights)
            cursor = start
            for offset, weight in enumerate(weights):
                step = (end - start) * weight / total
                times[a0 + offset] = (cursor, cursor + step)
                cursor += step
    # Words the ASR missed: interpolate between their timed neighbours.
    index = 0
    while index < len(times):
        if times[index] is not None:
            index += 1
            continue
        stop = index
        while stop < len(times) and times[stop] is None:
            stop += 1
        start = times[index - 1][1] if index > 0 else (times[stop][0] if stop < len(times) else 0.0)
        end = times[stop][0] if stop < len(times) else start + 0.3 * (stop - index)
        weights = [len(t) + 1 for t in tokens[index:stop]]
        total = sum(weights)
        cursor = start
        for offset, weight in enumerate(weights):
            step = (end - start) * weight / total
            times[index + offset] = (cursor, cursor + step)
            cursor += step
        index = stop
    # Monotonic, non-overlapping.
    fixed = []
    previous_end = 0.0
    for start, end in times:
        start = max(start, previous_end)
        end = max(end, start + 0.02)
        fixed.append((start, end))
        previous_end = end
    return fixed, matched / max(len(tokens), 1)


def has_punctuation(tokens):
    return sum(1 for token in tokens if PUNCTUATION.search(token)) >= max(1, len(tokens) // 40)


def plausible_asr(asr, tokens):
    """The recogniser's text looks like the same French passage, not a hallucination."""
    if not asr or not 0.6 <= len(asr) / max(len(tokens), 1) <= 1.5:
        return False
    text = ' '.join(word['text'] for word in asr)
    if re.search(r"[^\w\s'’\-,;:.!?…«»\"()%€$/°]", text) or re.search(r'[^\x00-\u024f\s«»’…€]', text):
        return False
    # A loop such as "c'est une compétence. c'est une compétence." is a hallucination.
    words = [normalize(word['text']) for word in asr]
    trigrams = [' '.join(words[i:i + 3]) for i in range(len(words) - 2)]
    return len(trigrams) == 0 or len(set(trigrams)) / len(trigrams) > 0.85


def load_sound(path):
    handle, wav = tempfile.mkstemp(suffix='.wav')
    os.close(handle)
    try:
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', path, '-ac', '1', '-ar', '16000', wav], check=True)
        return parselmouth.Sound(wav)
    finally:
        os.remove(wav)


def pitch_track(sound):
    """Two-pass pitch range adapted to the speaker (De Looze & Hirst)."""
    first = sound.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=500)
    values = first.selected_array['frequency']
    voiced = values[values > 0]
    if len(voiced) < 20:
        return first.xs(), values
    q15, q65 = np.quantile(voiced, [0.15, 0.65])
    pitch = sound.to_pitch_ac(time_step=0.01, pitch_floor=max(50, 0.75 * q15), pitch_ceiling=min(600, 1.5 * q65))
    return pitch.xs(), pitch.selected_array['frequency']


def silence_runs(sound):
    intensity = sound.to_intensity(minimum_pitch=75, time_step=0.01)
    values = intensity.values[0]
    times = intensity.xs()
    threshold = np.quantile(values, 0.95) - SILENCE_DB
    runs, start = [], None
    for time, value in zip(times, values):
        if value < threshold and start is None:
            start = time
        elif value >= threshold and start is not None:
            runs.append((start, time))
            start = None
    if start is not None:
        runs.append((start, times[-1]))
    return runs


def pause_between(word, following, runs):
    """The silence between two consecutive words, as (duration, start, end).

    The low-intensity stretch overlapping most of the span between the middles
    of the two words, or the gap the recogniser left between them when it is
    wider: in a reverberant room a short breath pause rarely drops to true
    silence. Its start is where the voice really stops, which the recogniser's
    word ends often overshoot.
    """
    low = (word[0] + word[1]) / 2
    high = (following[0] + following[1]) / 2
    best = (0.0, word[1], word[1])
    for start, end in runs:
        clipped = (max(start, low), min(end, high))
        duration = clipped[1] - clipped[0]
        if duration > best[0]:
            best = (duration, clipped[0], clipped[1])
    gap = following[0] - word[1]
    if gap > best[0]:
        best = (gap, word[1], following[0])
    return best


def semitones(times, freqs, median, low, high):
    mask = (times >= low) & (times <= high) & (freqs > 0)
    values = 12 * np.log2(freqs[mask] / median)
    return times[mask], values


def measure_intonation(times, freqs, median, group_start, group_end):
    """Movement of the voice on the last syllable before the group's pause.

    The last ~0.25 s of voiced speech is compared with the 0.45 s before it,
    in semitones. Frames at the very end of voicing are dropped: the pitch
    tracker is least reliable as the voice dies out.
    """
    voiced_times, values = semitones(times, freqs, median, group_start, group_end + 0.02)
    if len(values) < 10:
        return 'level', False
    # Octave jumps against the group's own median.
    keep = np.abs(values - np.median(values)) < 7
    voiced_times, values = voiced_times[keep], values[keep]
    if len(values) < 10:
        return 'level', False
    last = voiced_times[-1]
    final = values[(voiced_times > last - 0.25) & (voiced_times <= last - 0.02)]
    reference = values[(voiced_times > last - 0.7) & (voiced_times <= last - 0.25)]
    if len(final) < 6 or len(reference) < 5:
        return 'level', False
    tail = final[len(final) // 2:]
    delta = float(np.median(tail) - np.median(reference))
    if delta >= CLEAR_MOVEMENT:
        return 'rise', True
    if delta <= -CLEAR_MOVEMENT:
        return 'fall', True
    if abs(delta) <= FLAT_MOVEMENT:
        return 'level', True
    return ('rise' if delta > 0 else 'fall'), False


def contour(times, freqs, median, duration, step=0.1):
    """Pitch every `step` seconds, in semitones from the speaker's median.

    Rounded to the semitone; None where the voice is silent or unvoiced. The
    app draws it under the rhythmic groups, so the learner sees the real
    melody instead of trusting a label.
    """
    points = []
    for index in range(int(duration / step) + 1):
        centre = index * step
        window = freqs[(times >= centre - step / 2) & (times < centre + step / 2)]
        window = window[window > 0]
        points.append(None if len(window) < 3 else int(round(12 * np.log2(np.median(window) / median))))
    # Isolated octave jumps.
    for index in range(1, len(points) - 1):
        before, value, after = points[index - 1], points[index], points[index + 1]
        if value is not None and before is not None and after is not None:
            if abs(value - before) > 6 and abs(value - after) > 6:
                points[index] = int(round((before + after) / 2))
    return points


def syllables(word):
    return max(1, len(re.findall(r'[aeiouyàâäéèêëîïôöùûüœæ]+', word.lower())))


def pick_imitation(groups):
    """Starts at the first group and ends on a measured pause, 5–15 s long."""
    start = groups[0]['start']
    best = None
    for group in groups:
        duration = group['end'] - start
        if duration > MAX_IMITATION:
            break
        if duration >= MIN_IMITATION:
            best = group['end']
    if best is None:
        for first in range(len(groups)):
            for last in range(first, len(groups)):
                duration = groups[last]['end'] - groups[first]['start']
                if duration > MAX_IMITATION:
                    break
                if duration >= MIN_IMITATION:
                    return {'start': groups[first]['start'], 'end': groups[last]['end']}
        return None
    return {'start': start, 'end': best}


def annotate(entry, asr_words):
    # Caption cues such as [Musique] are not words the speaker says.
    tokens = [token for token in entry['transcript'].split() if not CUE.fullmatch(token)]
    asr = merge_asr_words(asr_words)
    times, ratio = align(tokens, asr)
    # YouTube auto-captions carry no punctuation and many misheard words: the
    # recogniser's own transcript is then the better text for the learner.
    if (ratio < MIN_MATCH_RATIO or not has_punctuation(tokens)) and plausible_asr(asr, tokens):
        tokens = [word['text'] for word in asr]
        times = [(word['start'], word['end']) for word in asr]
        times, ratio = align(tokens, asr)
    if ratio < MIN_MATCH_RATIO:
        return None, ratio, None

    sound = load_sound(os.path.join(ROOT, 'public', entry['audio']))
    pitch_times, freqs = pitch_track(sound)
    voiced = freqs[freqs > 0]
    median = float(np.median(voiced)) if len(voiced) else 150.0
    runs = silence_runs(sound)

    rates = [(end - start) / syllables(token) for token, (start, end) in zip(tokens, times)]
    typical_rate = float(np.median(rates))

    groups, buffer = [], []
    group_start = times[0][0]
    for index, token in enumerate(tokens):
        buffer.append(index)
        last = index == len(tokens) - 1
        if last:
            pause, pause_start, pause_end = 0.0, times[index][1], times[index][1]
        else:
            pause, pause_start, pause_end = pause_between(times[index], times[index + 1], runs)
        threshold = PUNCTUATED_PAUSE if PUNCTUATION.search(token) else PLAIN_PAUSE
        if not last and pause < threshold:
            continue
        # The group ends where the voice stops, not where the recogniser
        # closed the word.
        group_end = min(times[index][1], max(pause_start, times[index][0] + 0.05))
        intonation, measured = measure_intonation(pitch_times, freqs, median, group_start, group_end)
        words = [[round(times[i][0], 2), round(min(times[i][1], group_end), 2)] for i in buffer]
        group = {
            'text': ' '.join(tokens[i] for i in buffer),
            'start': round(group_start, 3),
            'end': round(group_end, 3),
            'intonation': intonation,
            'intonationMeasured': measured,
            'words': words,
        }
        if not last:
            group['pauseAfter'] = round(pause, 2)
        if rates[buffer[-1]] >= LENGTHENING_RATIO * typical_rate:
            group['finalLengthening'] = True
        groups.append(group)
        buffer = []
        if not last:
            group_start = max(pause_end, group_end)
            times[index + 1] = (max(times[index + 1][0], group_start), times[index + 1][1])
    return groups, ratio, contour(pitch_times, freqs, median, sound.duration)


NUMBER_LIST = re.compile(r'\[\s*((?:-?\d+(?:\.\d+)?|null)(?:,\s*(?:-?\d+(?:\.\d+)?|null))*)\s*\]')


def dump_compact(data) -> str:
    """Indented JSON, with lists of numbers kept on one line."""
    text = json.dumps(data, ensure_ascii=False, indent=2)
    text = NUMBER_LIST.sub(lambda match: '[' + ', '.join(re.split(r',\s*', match.group(1))) + ']', text)
    return text + '\n'


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', default=os.path.join(ROOT, '.cache', 'prosody-asr'))
    parser.add_argument('--data', default=os.path.join(ROOT, 'src', 'data', 'prosody.json'))
    parser.add_argument('--only', nargs='*')
    args = parser.parse_args()

    data = json.load(open(args.data, encoding='utf-8'))
    report = {'annotated': 0, 'skipped': []}
    for entry in data:
        if entry.get('modelKind') != 'recording':
            continue
        if args.only and entry['id'] not in args.only:
            continue
        cached = os.path.join(args.cache, f"{entry['id']}.json")
        if not os.path.exists(cached):
            report['skipped'].append((entry['id'], 'no-asr'))
            continue
        groups, ratio, pitch = annotate(entry, json.load(open(cached, encoding='utf-8'))['words'])
        if not groups:
            report['skipped'].append((entry['id'], f'match {ratio:.2f}'))
            continue
        imitation = pick_imitation(groups)
        if imitation is None:
            report['skipped'].append((entry['id'], 'no-imitation-window'))
            continue
        entry['transcript'] = ' '.join(group['text'] for group in groups)
        entry['groups'] = groups
        entry['imitation'] = {'start': round(imitation['start'], 3), 'end': round(imitation['end'], 3)}
        entry['annotation'] = 'acoustic'
        entry['pitch'] = {'step': 0.1, 'semitones': pitch}
        report['annotated'] += 1

    with open(args.data, 'w', encoding='utf-8') as handle:
        handle.write(dump_compact(data))
    print(f"{report['annotated']} extraits annotés depuis l'audio, {len(report['skipped'])} ignorés")
    for excerpt_id, reason in report['skipped']:
        print(f'  - {excerpt_id} : {reason}')


if __name__ == '__main__':
    sys.exit(main())
