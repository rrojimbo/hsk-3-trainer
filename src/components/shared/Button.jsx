import styles from './Button.module.css'

export function Button({ as = 'button', variant = 'primary', size = 'md', className = '', ...props }) {
  const Component = as
  const cls = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')
  // Если это <button>, оставляем type по умолчанию "button", чтобы не сабмитить формы.
  if (Component === 'button' && props.type == null) {
    props.type = 'button'
  }
  return <Component className={cls} {...props} />
}

