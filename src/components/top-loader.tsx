"use client";

import { useTheme } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import { useEffect, useState } from "react";

export default function TopLoader() {
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState("#3b82f6");

  useEffect(() => {
    if (resolvedTheme === "dark") {
      setColor("#dbdbd9");
    } else {
      setColor("#83858C");
    }
  }, [resolvedTheme]);

  return (
    <NextTopLoader
      showSpinner={false}
      color={color}
      height={2}
      crawl={true}
      easing="ease"
      speed={200}
      shadow="0 0 10px 1px rgba(0, 0, 0, 0.05)"
    />
  );
}
