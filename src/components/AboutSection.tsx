// src/components/AboutSection.tsx

export default function AboutSection() {
  return (
    <section
      id="section-about"
      className="bg-white border-t border-gray-200 mt-12 py-12 px-4 scroll-mt-28"
    >
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
        <span className="bg-linear-to-r from-(--color-accent) to-(--color-accent2) text-white text-[10px] font-black uppercase px-3 py-1 rounded-full mb-4">
          🎨 OUR STORY
        </span>
        <h3 className="text-3xl font-black text-gray-900 leading-tight">
          About InstaWear
        </h3>
        <p className="text-sm text-gray-600 mt-4 leading-relaxed max-w-2xl font-sans">
          InstaWear was founded by a collective of pop culture fans, sports
          enthusiasts, and AI engineers. Our mission: let you wear the energy of
          global events in real time.
        </p>
        <p className="text-sm text-gray-500 mt-2.5 leading-relaxed max-w-2xl font-sans">
          Every piece is made to order just for you — we connect directly to
          Printful production hubs. Zero excess inventory, zero wasted stock. We
          believe in reactive, circular fashion. This is the future of
          print‑on‑demand.
        </p>
        <div className="flex gap-4 sm:gap-8 md:gap-12 mt-8 text-center bg-gray-50/60 p-4 sm:p-6 rounded-2xl border border-gray-200">
          <div>
            <p className="text-3xl font-black text-(--color-accent) font-sans">
              100%
            </p>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mt-1">
              Certified Organic Cotton
            </p>
          </div>
          <div className="border-l border-gray-200"></div>
          <div>
            <p className="text-3xl font-black text-indigo-400 font-sans">0</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mt-1">
              Destroyed Inventory
            </p>
          </div>
          <div className="border-l border-gray-200"></div>
          <div>
            <p className="text-3xl font-black text-amber-500 font-sans">24h</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mt-1">
              Design → Print
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
