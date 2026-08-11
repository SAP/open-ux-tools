export interface UIBaseButtonProps {
    /**
     * When true, the component handles Alt+Down internally to open the contextual menu,
     * preventing the host application's menubar from stealing focus on menu dismiss.
     *
     * @default true
     */
    propagateMenuOpenKeyDown?: boolean;
}
