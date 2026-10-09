type Asker = (message: string) => Promise<boolean>;

let asker: Asker = (message) => Promise.resolve(window.confirm(message));

export function setConfirmAsker(a: Asker) {
  asker = a;
}

export function askConfirm(message: string): Promise<boolean> {
  return asker(message);
}
