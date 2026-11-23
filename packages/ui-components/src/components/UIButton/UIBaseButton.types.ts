export interface UIBaseButtonProps {
    /**
     * When true (default), Alt+Down is intercepted internally: preventDefault() is called before
     * Fluent's own handler runs, which prevents Fluent from calling stopPropagation() so the event
     * continues to bubble. This stops the host application's menubar from stealing focus after the
     * contextual menu is dismissed.
     * Set to false to skip this interception and use Fluent's default Alt+Down handling.
     *
     * @default true
     */
    propagateMenuOpenKeyDown?: boolean;
}
