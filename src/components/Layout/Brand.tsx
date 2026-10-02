import { Link } from 'react-router-dom'
import { Logo } from '../Brand/Logo'

export function Brand() {
  return (
    <Link to="/" className="brand">
      <Logo size={40} />
      <span className="brand__text">
        <span className="brand__name">Parle+</span>
        <small className="brand__tagline">français parlé</small>
      </span>
    </Link>
  )
}
