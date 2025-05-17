// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    // Include other paths to your source files
  ],
  safelist: [
    "bg-green-400",
    "bg-amber-400",
    "bg-red-400",
    "bg-blue-400",
    "bg-yellow-400",
    "bg-purple-400",
    // Add other dynamically used background colors
  ],
  // rest of your config
};
