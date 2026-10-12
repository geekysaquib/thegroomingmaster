import { useCallback, useState } from "react";
import { Button, Modal } from "./ui";

/**
 * In-app replacement for window.confirm. Usage:
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (!(await confirm({ title, message, confirmLabel, danger }))) return;
 *   ...and render {confirmDialog} once in the page.
 */
export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const close = (answer) => { state.resolve(answer); setState(null); };

  const dialog = state && (
    <Modal title={state.title || "Are you sure?"} onClose={() => close(false)}>
      <p className="text-sm text-ink-secondary">{state.message}</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" autoFocus onClick={() => close(false)}>{state.cancelLabel || "Cancel"}</Button>
        <Button variant={state.danger ? "danger" : "primary"} onClick={() => close(true)}>{state.confirmLabel || "Confirm"}</Button>
      </div>
    </Modal>
  );
  return [confirm, dialog];
}
