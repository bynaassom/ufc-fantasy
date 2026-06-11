"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const OnboardingTour = dynamic(() => import("./OnboardingTour"), {
  ssr: false,
});

export default function HomeWithTour({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  const [tour, setTour] = useState(show);
  const router = useRouter();

  useEffect(() => {
    if (show && !tour) {
      router.refresh();
    }
  }, [show, tour, router]);

  return (
    <>
      {tour && <OnboardingTour onComplete={() => setTour(false)} />}
      {children}
    </>
  );
}
