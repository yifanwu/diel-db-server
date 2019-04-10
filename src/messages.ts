export const FgRed = "\x1b[31m";
export const FgBlue = "\x1b[34m";
export const Reset = "\x1b[0m";

export function LogError(m: string) {
  console.log(`${FgRed}%s${Reset}`, m);
}

export function LogWarning(m: string) {
  console.log(`${FgRed}%s${Reset}`, m);
}

export function LogInfo(m: string) {
  console.log(`${FgBlue}%s${Reset}`, m);
}