"use client";
import Image from "next/image";

interface CarLogoProps {
  make: string;
}

// Car logo mapping - you'll place SVGs in public/car-logos/
const carLogoMap: Record<string, string> = {
  toyota: "/car-logos/toyota.svg",
  honda: "/car-logos/honda.svg",
  ford: "/car-logos/ford.svg",
  chevrolet: "/car-logos/chevrolet.svg",
  bmw: "/car-logos/bmw.svg",
  mercedes: "/car-logos/mercedes.svg",
  volkswagen: "/car-logos/volkswagen.svg",
  audi: "/car-logos/audi.svg",
  nissan: "/car-logos/nissan.svg",
  tesla: "/car-logos/tesla.svg",
  lexus: "/car-logos/lexus.svg",
  porsche: "/car-logos/porsche.svg",
  ferrari: "/car-logos/ferrari.svg",
  lamborghini: "/car-logos/lamborghini.svg",
  land_rover: "/car-logos/land_rover.svg",
  rolls_royce: "/car-logos/rolls_royce.svg",
  bentley: "/car-logos/bentley.svg",
  default: "/car-logos/default.svg",
};

export function CarLogo({ make }: CarLogoProps) {
  const logoPath = carLogoMap[make.toLowerCase()] || carLogoMap.default;

  // https://www.svgrepo.com/collection/car-labels-flat-logos/

  return (
    <div className="flex items-center justify-center">
      <Image
        src={logoPath}
        alt={`${make} logo`}
        loading="lazy"
        unoptimized
        width={20}
        height={20}
      />
    </div>
  );
}
