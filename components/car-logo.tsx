"use client";
import { useState } from "react";
import { Car } from "lucide-react";

interface CarLogoProps {
  make: string;
  size?: number;
  className?: string;
}

// Car logo mapping - you'll place SVGs in public/car-logos/
const carLogoMap: Record<string, string> = {
  // Common brands - normalize to lowercase for consistency
  toyota: "/car-logos/toyota.svg",
  honda: "/car-logos/honda.svg",
  ford: "/car-logos/ford.svg",
  chevrolet: "/car-logos/chevrolet.svg",
  bmw: "/car-logos/bmw.svg",
  "mercedes-benz": "/car-logos/mercedes-benz.svg",
  volkswagen: "/car-logos/volkswagen.svg",
  audi: "/car-logos/audi.svg",
  nissan: "/car-logos/nissan.svg",
  tesla: "/car-logos/tesla.svg",
  lexus: "/car-logos/lexus.svg",
  porsche: "/car-logos/porsche.svg",
  ferrari: "/car-logos/ferrari.svg",
  lamborghini: "/car-logos/lamborghini.svg",
  default: "/car-logos/default.svg",
};

export function CarLogo({ make, size = 20, className = "" }: CarLogoProps) {
  const [hasError, setHasError] = useState(false);

  // Get logo path, fallback to default if not found
  const normalizedMake = make.toLowerCase().replace(/\s+/g, "-");
  const logoPath = carLogoMap[normalizedMake] || carLogoMap.default;

  // If logo fails to load or we don't have a logo, show icon
  if (hasError || !logoPath) {
    return (
      <div
        className={`relative ${className}`}
        style={{ width: size, height: size }}
      >
        <Car className="w-full h-full text-muted-foreground" size={size} />
      </div>
    );
  }

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={logoPath}
        alt={`${make} logo`}
        className="w-full h-full object-contain"
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
}
