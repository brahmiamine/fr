"""Word-level timestamps for every bundled prosody recording.

Runs faster-whisper on each `modelKind: "recording"` excerpt and caches the raw
words to `<cache>/<id>.json`. The model is deliberately not primed with the
excerpt's transcript: on these short clips the prompt makes it hallucinate
(repeated phrases, subtitle credits) instead of following the audio.
Already cached excerpts are skipped, so the command can be resumed.

    pip install faster-whisper
    python3 scripts/prosody_audio/asr_words.py --cache .cache/prosody-asr
"""
import argparse
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', default=os.path.join(ROOT, '.cache', 'prosody-asr'))
    parser.add_argument('--model', default='small')
    parser.add_argument('--data', default=os.path.join(ROOT, 'src', 'data', 'prosody.json'))
    parser.add_argument('--only', nargs='*', help='limit to these excerpt ids')
    args = parser.parse_args()

    from faster_whisper import WhisperModel

    os.makedirs(args.cache, exist_ok=True)
    entries = [e for e in json.load(open(args.data, encoding='utf-8')) if e.get('modelKind') == 'recording']
    if args.only:
        entries = [e for e in entries if e['id'] in set(args.only)]
    model = WhisperModel(args.model, device='cpu', compute_type='int8')

    for index, entry in enumerate(entries):
        target = os.path.join(args.cache, f"{entry['id']}.json")
        if os.path.exists(target):
            continue
        segments, _ = model.transcribe(
            os.path.join(ROOT, 'public', entry['audio']),
            language='fr',
            word_timestamps=True,
            beam_size=5,
            condition_on_previous_text=False,
        )
        words = [
            {'text': word.word, 'start': round(word.start, 3), 'end': round(word.end, 3), 'p': round(word.probability, 3)}
            for segment in segments
            for word in segment.words
        ]
        with open(target, 'w', encoding='utf-8') as handle:
            json.dump({'id': entry['id'], 'model': args.model, 'words': words}, handle, ensure_ascii=False)
        print(f"[{index + 1}/{len(entries)}] {entry['id']} · {len(words)} mots", flush=True)


if __name__ == '__main__':
    sys.exit(main())
