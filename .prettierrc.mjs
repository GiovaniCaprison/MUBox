/**
 * Our formatting configuration.
 *
 * @see https://prettier.io/docs/en/configuration.html
 * @satisfies {import("prettier").Config}
 */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],
  printWidth: 140,
};

export default config;