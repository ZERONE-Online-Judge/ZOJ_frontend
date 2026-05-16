import { useEffect, useState } from 'react';

function currentDocumentVisibility() {
  return typeof document === 'undefined' ? true : !document.hidden;
}

export default function useDocumentVisibility() {
  const [isVisible, setIsVisible] = useState(currentDocumentVisibility);

  useEffect(() => {
    function handleVisibilityChange() {
      setIsVisible(currentDocumentVisibility());
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
