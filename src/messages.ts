export const FgRed = "\x1b[31m";
export const FgBlue = "\x1b[34m";
export const Reset = "\x1b[0m";

export function LogError(m: string): null {
  console.log(`${FgRed}%s${Reset}`, m);
  return null;
}

export function LogWarning(m: string): null {
  console.log(`${FgRed}%s${Reset}`, m);
  return null;
}

export function LogInfo(m: string): null {
  console.log(`${FgBlue}%s${Reset}`, m);
  return null;
}