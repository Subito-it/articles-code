import { MultiSelect } from './components/MultiSelect';
import type { OptionNode } from './components/Option';
import './index.css';

const BRAND_SEED = [
  'Nike', 'Adidas', 'Puma', 'Reebok', 'New Balance', 'Converse', 'Vans',
  'Hogan', 'Alberto Guardiani', 'Alviero Martini', 'Fendi', 'Gucci',
  'Prada', 'Versace', 'Armani', 'Diesel', "Levi's", 'Timberland',
  'Clarks', 'Geox', 'Dr. Martens', 'Skechers', 'Asics', 'Salomon',
];

const TOTAL_OPTIONS = 1200;

const ALL_BRANDS: OptionNode[] = Array.from({ length: TOTAL_OPTIONS }, (_, i) => {
  const base = BRAND_SEED[i % BRAND_SEED.length];
  const suffix = i < BRAND_SEED.length ? '' : ` ${Math.floor(i / BRAND_SEED.length)}`;
  return { id: `brand-${i}`, label: `${base}${suffix}` };
});

export const App = () => {
  return (
    <main className="page">
      <h1>MultiSelect — virtual scroll ({TOTAL_OPTIONS} options)</h1>
      <p className="lede">
        Ported from the real fix: a hand-rolled windowing hook over the
        option list, plus a stable toggle callback and deferred
        derived-value computation.
      </p>

      <MultiSelect
        ariaLabel="Brand"
        options={ALL_BRANDS}
        onSelectionChange={(value) =>
          console.log('selectedOptions:', value.selectedOptions.length)
        }
      />
    </main>
  );
};
