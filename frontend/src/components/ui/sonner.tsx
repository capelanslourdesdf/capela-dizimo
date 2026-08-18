import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success:
            'group-[.toaster]:bg-success group-[.toaster]:text-success-foreground group-[.toaster]:border-success',
          error:
            'group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground group-[.toaster]:border-destructive',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
