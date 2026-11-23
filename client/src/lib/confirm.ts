export interface ConfirmOptions {
  title?: string;
  accept?: string;
  cancel?: string;
}

type Asker = (message: string, options?: ConfirmOptions) => Promise<boolean>;

let asker: Asker = (message) => Promise.resolve(window.confirm(message));

export function setConfirmAsker(a: Asker) {
  asker = a;
}

export function askConfirm(
  message: string,
  options?: ConfirmOptions,
): Promise<boolean> {
  return asker(message, options);
}
