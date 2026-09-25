import { Suspense, lazy, useEffect, useState, type ComponentType } from "react";
import { PlaceholderScene } from "./PlaceholderScene";

// Throwaway prototypes live in src/prototypes/<name>/index.tsx and are
// reached at #/proto/<name>. Delete the folder when the prototype is done.
const prototypes = import.meta.glob<{ default: ComponentType }>(
  "./prototypes/*/index.tsx",
);

function prototypeFromHash(hash: string) {
  const name = hash.match(/^#\/proto\/([\w-]+)$/)?.[1];
  const load = name && prototypes[`./prototypes/${name}/index.tsx`];
  return load ? lazy(load) : null;
}

export function App() {
  const [hash, setHash] = useState(location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(location.hash);
    addEventListener("hashchange", onHashChange);
    return () => removeEventListener("hashchange", onHashChange);
  }, []);

  const Prototype = prototypeFromHash(hash);
  if (!Prototype) return <PlaceholderScene />;

  return (
    <Suspense fallback={null}>
      <Prototype />
    </Suspense>
  );
}
