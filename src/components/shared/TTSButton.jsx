import { Button } from './Button'

export function TTSButton({ onSpeak, disabled, title = 'Озвучить (TTS)', ...props }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onSpeak}
      disabled={disabled}
      aria-label={title}
      title={title}
      {...props}
    >
      🔊
    </Button>
  )
}

