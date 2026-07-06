import { useEffect } from "react";

export function useBodyClass(flag: boolean, className: string): void {
  useEffect(() => {
    document.body.classList.toggle(className, flag);
    return () => {
      document.body.classList.remove(className);
    };
  }, [flag, className]);
}
