import { useRef } from "react";

let hasEverMounted = false;

export function useIsInitialMount() {
  const isFirst = useRef(!hasEverMounted);

  if (!hasEverMounted) {
    hasEverMounted = true;
  }

  return isFirst.current;
}
