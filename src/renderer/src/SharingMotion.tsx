import { useEffect, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { animate, createScope, createTimeline, createTimer, stagger, utils } from 'animejs'
import type { Timeline } from 'animejs'

const glyphs = '0123456789abcdef#$%&*+=<>/'
const reducedMotion = { reduce: '(prefers-reduced-motion: reduce)' }
// The modal closes this long after the last movement ends.
const holdAfterEnd = 1500

// prepare: the main process makes the file. wait: the object waits at the AirDrop picker or in the relay queue.
// handed: the picker closed. macOS reports no delivery, so the object goes into the AirDrop rings and never lands.
// delivered: the relay reported that the recipient received the transfer, so the object lands on the recipient.
// received: an encrypted relay transfer reached this Mac. It is not imported yet.
// arrived: this Mac imported a transfer, so the object lands in the destination project.
export type HandoffStage = 'prepare' | 'wait' | 'handed' | 'delivered' | 'received' | 'arrived'

export type HandoffRoute = 'airdrop' | 'relay'

// A device card shows the real device name and fingerprint. Secrets travel as a key.
export type HandoffObject =
  | { shape: 'device'; name: string; fingerprint: string }
  | { shape: 'key'; title: ReactNode; detail: ReactNode }

// A square-cut key: a bow with a hole, a shaft, and three teeth. The even-odd rule cuts the hole.
const keyPath = 'M0 8H48V26H160V52H148V38H142V48H134V38H128V50H118V38H48V56H0ZM14 22H34V42H14Z'
// Copies of the outline at different depths give the flat key a visible thickness when it turns.
const keyLayers = [0, 1, 2, 3, 4]

// The SpacetimeDB mark: two orbit swooshes around a ring. The relay hub draws it in the accent color.
const relayMark = [
  'M28.8002 15.317C28.5535 9.53226 29.63 6.19046 35 0L24.2649 10.9106C26.8343 14.2552 26.6051 19.0995 23.5774 22.1767C20.5498 25.2538 15.7834 25.4867 12.4925 22.8754L10.5042 24.8962L10.5116 24.9024L7.35285 28.1361C9.73784 26.7321 13.4208 27.1349 15.6425 27.3779C16.2579 27.4452 16.7611 27.5003 17.0937 27.5013C20.1371 27.6534 23.2301 26.5483 25.5544 24.186C27.9465 21.7549 29.0284 18.4965 28.8002 15.317Z',
  'M17.9063 4.49871C18.2389 4.49971 18.7421 4.55476 19.3575 4.62207C21.5792 4.86508 25.2622 5.26792 27.6472 3.86395L24.4884 7.0976L24.4958 7.10383L22.5075 9.12462C19.2166 6.51328 14.4502 6.74618 11.4226 9.82332C8.3949 12.9005 8.16574 17.7448 10.7351 21.0894L0 32C5.36996 25.8095 6.44651 22.4677 6.1998 16.683C5.97163 13.5035 7.05355 10.2451 9.44557 7.81402C11.7699 5.45167 14.8629 4.34657 17.9063 4.49871Z',
  'M24.7486 16C24.7486 20.0687 21.5033 23.367 17.5 23.367C13.4967 23.367 10.2514 20.0687 10.2514 16C10.2514 11.9313 13.4967 8.63292 17.5 8.63292C21.5033 8.63292 24.7486 11.9313 24.7486 16ZM17.5 21.6C20.5752 21.6 23.0682 19.0928 23.0682 16C23.0682 12.9072 20.5752 10.4 17.5 10.4C14.4248 10.4 11.9318 12.9072 11.9318 16C11.9318 19.0928 14.4248 21.6 17.5 21.6Z'
]
// One audio context for every swoosh. The app creates it at the first relay send.
let audio: AudioContext | undefined

// Radii of the AirDrop rings, from the center outward.
const ringRadii = [36, 72, 108, 144, 180]

type Frame = Record<string, number>
const landed: Frame = { '--x': 1, '--y': 0, '--rx': 0, '--ry': 0, '--r': 0, '--s': 1, opacity: 1 }

// The last frame of each stage. Reduced motion shows it with no movement.
// --x runs from 0 (sender screen) to 1 (recipient screen). --rx and --ry are 3D rotations in degrees.
// In the relay queue, the object is inside the hub, so it is not visible.
function stillFrame(stage: HandoffStage, via: HandoffRoute): Frame {
  if (stage === 'prepare') return { '--x': 0, '--y': 0, '--rx': 14, '--ry': 0, '--r': 0, '--s': 1, opacity: 1 }
  if (stage === 'wait') return { '--x': 0.5, '--y': -14, '--rx': 14, '--ry': 0, '--r': 0, '--s': via === 'relay' ? 0.2 : 1, opacity: via === 'relay' ? 0 : 1 }
  if (stage === 'handed') return { '--x': 0.5, '--y': -14, '--rx': 14, '--ry': 90, '--r': 0, '--s': 0.6, opacity: 0 }
  return landed
}

// A modal shows an object that travels from the sender to the recipient. It locks while work is in progress
// and closes by itself after the object goes into the AirDrop rings or lands. A relay transfer can wait in the
// queue for a long time, so the user can close the modal while the relay hub holds the object.
export function HandoffModal({ heading, from, to, via = 'airdrop', stage, object, onDone }: {
  heading: string
  from: string
  to: string
  via?: HandoffRoute
  stage: HandoffStage
  object: HandoffObject
  onDone: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const stageNode = useRef<HTMLDivElement>(null)
  const previous = useRef<HandoffStage | null>(null)
  const locked = stage === 'prepare' || (via === 'airdrop' && stage === 'wait')
  const finished = stage === 'handed' || stage === 'delivered' || stage === 'received' || stage === 'arrived'

  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
  }, [])

  // A layout effect sets the first frame before paint, so the object never shows in a wrong position.
  useLayoutEffect(() => {
    let closing: ReturnType<typeof setTimeout> | undefined
    const close = () => { closing = setTimeout(() => dialog.current?.close(), holdAfterEnd) }
    const scope = createScope({ root: stageNode, mediaQueries: reducedMotion }).add((self) => {
      if (self?.matches.reduce) {
        utils.set('.handoff-object', stillFrame(stage, via))
        utils.set('.handoff-note', { opacity: finished ? 1 : 0 })
        utils.set('.handoff-screen-to', { opacity: stage === 'handed' || stage === 'wait' || stage === 'prepare' ? 0.5 : 1 })
        if (finished) close()
        return
      }
      choreograph(stage, previous.current, via, close)
    })
    previous.current = stage
    return () => {
      clearTimeout(closing)
      scope.revert()
    }
  }, [stage, via, finished])

  return (
    <dialog ref={dialog} className="handoff-dialog" aria-labelledby="handoff-heading"
      onCancel={(event) => { if (locked) event.preventDefault() }} onClose={onDone}>
      <h2 id="handoff-heading">{heading}</h2>
      <p className="handoff-caption" role="status">{caption(stage, via, to)}</p>
      <div ref={stageNode} className="handoff" aria-hidden="true">
        {via === 'airdrop' && <svg className="handoff-rings" viewBox="-184 -184 368 368">
          {ringRadii.map((radius) => <circle key={radius} className="handoff-ring" r={radius} />)}
        </svg>}
        <span className="handoff-mac handoff-screen handoff-screen-from" />
        <span className="handoff-mac handoff-screen handoff-screen-to" />
        {via === 'relay' && <span className="handoff-hub">
          <svg viewBox="0 0 35 32">{relayMark.map((path) => <path key={path} d={path} fillRule="evenodd" />)}</svg>
        </span>}
        <div className={`handoff-object handoff-object-${object.shape}`}>
          <HandoffObjectFaces object={object} />
        </div>
        <span className="handoff-label handoff-label-from">{from}</span>
        <span className="handoff-label handoff-label-gate">{via === 'relay' ? 'Relay' : 'AirDrop'}</span>
        <span className="handoff-label handoff-label-to">
          {to}
          <span className="handoff-note">{note(stage)}</span>
        </span>
      </div>
      {!locked && !finished && <div className="form-actions">
        <button type="button" className="secondary" onClick={() => dialog.current?.close()}>Close</button>
      </div>}
    </dialog>
  )
}

function HandoffObjectFaces({ object }: { object: HandoffObject }) {
  if (object.shape === 'device') return <>
    <div className="handoff-face handoff-front handoff-device">
      <span className="handoff-kind">.sct device card</span>
      <span className="handoff-title">{object.name}</span>
      <span className="handoff-fingerprint">{object.fingerprint}</span>
    </div>
    <div className="handoff-face handoff-back handoff-device-back">
      <span className="handoff-back-text">Public keys only. Compare the pairing code before you confirm.</span>
    </div>
  </>
  return <>
    <span className="handoff-key">
      {keyLayers.map((layer) => <svg key={layer} className="handoff-key-layer" viewBox="0 0 160 64"><path d={keyPath} fillRule="evenodd" /></svg>)}
    </span>
    <span className="handoff-key-text">
      <span className="handoff-title">{object.title}</span>
      <span className="handoff-detail">{object.detail}</span>
    </span>
  </>
}

function caption(stage: HandoffStage, via: HandoffRoute, to: string): string {
  if (stage === 'prepare') return via === 'relay' ? 'Encrypting the transfer…' : 'Preparing the file…'
  if (stage === 'wait') return via === 'relay' ? `Queued for ${to}. The relay sends it when ${to} connects.` : `Choose ${to} in the AirDrop picker.`
  if (stage === 'handed') return `Sent if you chose ${to}. macOS does not confirm delivery.`
  if (stage === 'delivered') return `${to} received the transfer.`
  if (stage === 'received') return 'The encrypted transfer reached this Mac.'
  return `Imported into ${to}.`
}

function note(stage: HandoffStage): string {
  if (stage === 'delivered') return 'Received'
  if (stage === 'received') return 'Received'
  if (stage === 'arrived') return 'Imported'
  return 'Sent if you chose it'
}

function choreograph(stage: HandoffStage, previous: HandoffStage | null, via: HandoffRoute, close: () => void): void {
  if (stage === 'prepare') {
    appear(createTimeline())
    // The object sways in 3D while the main process signs or encrypts the file.
    animate('.handoff-object', { '--ry': [-14, 14], '--y': [0, -5], duration: 1400, delay: 700, ease: 'inOutSine', loop: true, alternate: true })
    return
  }
  if (stage === 'wait') {
    const timeline = createTimeline()
    // The previous stage was reverted, so the object starts again from the last prepare frame.
    if (previous === 'prepare') utils.set('.handoff-object', stillFrame('prepare', via))
    else appear(timeline)
    travel(timeline, 0.5, 14, 800, via === 'relay' ? 'in' : undefined)
    if (via === 'relay') {
      consume(timeline)
      timeline.call(() => { spinHub() })
      return
    }
    // The object hovers in the AirDrop rings until the picker closes.
    const hover = animate('.handoff-object', { '--y': [-14, -20], '--ry': [-10, 10], duration: 1600, ease: 'inOutSine', loop: true, alternate: true, autoplay: false })
    timeline.call(() => { hover.play() })
    ripple(true)
    return
  }
  if (stage === 'handed') {
    utils.set('.handoff-object', stillFrame('wait', via))
    // The object turns edge-on and goes into the center of the rings.
    createTimeline({ onComplete: close })
      .add('.handoff-object', { '--ry': 90, '--s': 0.6, duration: 620, ease: 'inQuad' })
      .add('.handoff-object', { opacity: 0, duration: 160, ease: 'linear' }, '-=160')
      .add('.handoff-note', { opacity: [0, 1], translateY: [4, 0], duration: 400, ease: 'outQuad' }, '-=300')
    ripple(false)
    return
  }
  if (stage === 'delivered') {
    // The hub held the object in the queue. It sends the object out to the recipient.
    const timeline = createTimeline({ onComplete: close })
    emit(timeline)
    travel(timeline, 1, 0, 800, 'out')
    land(timeline)
    return
  }
  const timeline = createTimeline({ onComplete: close })
  appear(timeline)
  if (via === 'relay') {
    travel(timeline, 0.5, 14, 800)
    consume(timeline)
    emit(timeline)
    travel(timeline, 1, 0, 800)
  } else {
    ripple(false)
    travel(timeline, 1, 0)
  }
  land(timeline)
}

// The object rises out of the sender screen and tilts toward the viewer.
function appear(timeline: Timeline): void {
  utils.set('.handoff-object', { '--x': 0, '--y': 18, '--rx': 64, '--ry': 0, '--r': 0, '--s': 0.9, opacity: 0 })
  timeline
    .add('.handoff-object', { '--y': 0, '--rx': 14, '--s': 1, opacity: 1, duration: 620, ease: 'outExpo' })
    .add('.handoff-front > *, .handoff-key-text > *', { opacity: [0, 1], translateY: [6, 0], duration: 360, ease: 'outQuad', delay: stagger(60) }, '-=480')
}

// The object lifts, flips one full turn on its vertical axis along an arc, and levels out at the target.
// A flight to the middle is shorter than a flight across the whole stage. A relay send plays a swoosh during the flight.
function travel(timeline: Timeline, to: number, tilt: number, duration = 1100, sound?: 'in' | 'out'): void {
  timeline.add('.handoff-object', { '--y': -16, '--r': -3, duration: 260, ease: 'outQuad' })
  // The swoosh in also covers the take-in at the hub. The swoosh out also covers the landing.
  if (sound) timeline.call(() => { swoosh(sound, duration / 1000 + 0.5) })
  timeline
    .add('.handoff-object', {
      '--x': to,
      '--y': [{ to: -46, ease: 'outQuad' }, { to: -14, ease: 'inQuad' }],
      '--ry': [0, 360],
      '--rx': [{ to: 28 }, { to: tilt }],
      '--r': [{ to: 2 }, { to: 0 }],
      duration,
      ease: 'inOutCubic'
    })
    // The flip ends at 360 degrees. Reset it to 0 so the next rotation starts from the front.
    .set('.handoff-object', { '--ry': 0 })
}

// A swoosh from brown noise through a gentle low-pass filter. The sound is made at run time, so no audio file ships with the app.
// in: the object goes into the hub. The sound swells early, then fades slowly and falls in pitch (a decrescendo).
// out: the hub sends the object out. The sound builds slowly and rises in pitch, then eases off (a crescendo).
function swoosh(direction: 'in' | 'out', seconds: number): void {
  audio ??= new AudioContext()
  void audio.resume()
  const now = audio.currentTime
  const noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * seconds), audio.sampleRate)
  const samples = noise.getChannelData(0)
  // Brown noise is white noise passed through a leaky integrator. It sounds deeper and softer than white noise.
  let level = 0
  for (let index = 0; index < samples.length; index++) {
    level = (level + 0.02 * (Math.random() * 2 - 1)) / 1.02
    samples[index] = level * 3.5
  }
  const source = audio.createBufferSource()
  source.buffer = noise
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 0.7
  filter.frequency.setValueCurveAtTime(sweep(direction === 'in' ? 1600 : 250, direction === 'in' ? 250 : 1600), now, seconds)
  const volume = audio.createGain()
  // A quiet peak: the sound accompanies a private action, so it stays in the background.
  volume.gain.setValueCurveAtTime(swell(direction === 'in' ? 0.3 : 0.75, 0.12), now, seconds)
  source.connect(filter).connect(volume).connect(audio.destination)
  source.start(now)
  source.stop(now + seconds)
}

// A volume curve that rises along a sine-squared ease to the peak, then falls the same way to silence.
// peakAt is the peak position as a fraction of the sound.
function swell(peakAt: number, peak: number): Float32Array {
  return Float32Array.from({ length: 256 }, (_, index) => {
    const position = index / 255
    const phase = position < peakAt ? position / peakAt : (1 - position) / (1 - peakAt)
    return peak * Math.sin((phase * Math.PI) / 2) ** 2
  })
}

// A frequency curve that eases from one value to another on an exponential scale, which the ear hears as an even glide.
function sweep(from: number, to: number): Float32Array {
  return Float32Array.from({ length: 256 }, (_, index) => {
    const ease = Math.sin(((index / 255) * Math.PI) / 2) ** 2
    return from * (to / from) ** ease
  })
}

// The relay hub takes the object in: the object shrinks into the center, and the hub swells.
function consume(timeline: Timeline): void {
  timeline
    .add('.handoff-object', { '--y': 0, '--s': 0.2, opacity: 0, duration: 460, ease: 'inBack' })
    .add('.handoff-hub', { scale: [1, 1.2, 1], duration: 520, ease: 'outQuad' }, '-=260')
}

// The relay hub sends the object out again from its center.
function emit(timeline: Timeline): void {
  timeline
    .set('.handoff-object', { '--x': 0.5, '--y': 0, '--rx': 14, '--ry': 0, '--r': 0, '--s': 0.2, opacity: 0 })
    .add('.handoff-hub', { scale: [1, 1.2, 1], duration: 520, ease: 'outQuad' })
    .add('.handoff-object', { '--s': 1, '--y': -14, opacity: 1, duration: 480, ease: 'outBack' }, '-=320')
}

// The object settles on the recipient screen, and the screen and the note light up.
function land(timeline: Timeline): void {
  timeline
    .add('.handoff-object', { '--y': 0, '--s': [1.04, 1], duration: 420, ease: 'outBack' })
    .add('.handoff-screen-to', { opacity: [0.5, 1], duration: 300, ease: 'outQuad' }, '-=320')
    .add('.handoff-note', { opacity: [0, 1], translateY: [4, 0], duration: 400, ease: 'outQuad' }, '-=200')
}

// The hub turns slowly while the transfer waits in the queue.
function spinHub(): void {
  animate('.handoff-hub svg', { rotate: 360, duration: 6000, ease: 'linear', loop: true })
}

// Waves move outward through the AirDrop rings. The search keeps waving until the picker closes.
function ripple(repeat: boolean): void {
  animate('.handoff-ring', { opacity: [0.2, 0.9, 0.2], duration: 1200, delay: stagger(140), ease: 'inOutSine', loop: repeat })
}

// Names change to random glyphs while the app encrypts, and change back after the app decrypts.
// The glyphs are decoration only. They are not the ciphertext, and screen readers get the real name.
export function Scramble({ text, mode }: { text: string; mode: 'encrypt' | 'decrypt' }) {
  const node = useRef<HTMLSpanElement>(null)

  // A layout effect sets the first frame before paint, so the decrypt mode never shows the name too early.
  useLayoutEffect(() => {
    const element = node.current
    if (!element) return
    const scope = createScope({ mediaQueries: reducedMotion }).add((self) => {
      if (self?.matches.reduce) return
      const progress = { value: 0 }
      const draw = () => { element.textContent = scramble(text, progress.value, mode) }
      draw()
      // Encrypted names keep changing until the operation ends.
      const churn = createTimer({ duration: 150, loop: true, autoplay: false, onLoop: draw })
      animate(progress, { value: 1, duration: 900, ease: 'linear', onUpdate: draw, onComplete: () => { if (mode === 'encrypt') churn.play() } })
      return () => { element.textContent = text }
    })
    return () => scope.revert()
  }, [text, mode])

  return (
    <>
      <span className="sr-only">{text}</span>
      <span ref={node} className="sharing-scramble" aria-hidden="true">{text}</span>
    </>
  )
}

function scramble(text: string, progress: number, mode: 'encrypt' | 'decrypt'): string {
  const changed = Math.round(progress * text.length)
  return [...text].map((character, index) => {
    const hidden = mode === 'encrypt' ? index < changed : index >= changed
    return hidden ? glyphs.charAt(Math.floor(Math.random() * glyphs.length)) : character
  }).join('')
}
