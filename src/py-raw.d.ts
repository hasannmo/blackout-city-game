// Memungkinkan: import src from "...file.py?raw"  (isi file sebagai string)
declare module "*.py?raw" {
  const source: string;
  export default source;
}
