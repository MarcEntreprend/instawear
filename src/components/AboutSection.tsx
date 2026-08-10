// src/components/AboutSection.tsx

export default function AboutSection() {
  return (
    <section
      id="section-about"
      className="bg-white border-t border-gray-200 mt-12 py-16 px-4 scroll-mt-28"
    >
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
        <span className="eyebrow mb-4">Our story</span>
        <h3 className="font-serif text-3xl sm:text-4xl text-gray-900 leading-tight">
          About InstaWear
        </h3>
        <p className="text-sm text-gray-600 mt-5 leading-relaxed max-w-2xl">
          InstaWear was founded by a collective of pop culture fans, sports
          enthusiasts, and AI engineers. Our mission: let you wear the energy of
          global events in real time.
        </p>
        <p className="text-sm text-gray-500 mt-2.5 leading-relaxed max-w-2xl">
          Every piece is made to order just for you, connected directly to
          Printful production hubs. Zero excess inventory, zero wasted stock. We
          believe in reactive, circular fashion.
        </p>
        <div className="grid grid-cols-3 gap-4 sm:gap-10 mt-10 text-center bg-gray-50/60 p-6 sm:p-8 rounded-3xl border border-gray-200 w-full max-w-2xl">
          <div>
            <p className="stat-figure">100%</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-2">
              Organic cotton
            </p>
          </div>
          <div className="border-l border-gray-200 flex flex-col items-center">
            <p className="stat-figure">0</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-2">
              Destroyed inventory
            </p>
          </div>
          <div className="border-l border-gray-200 flex flex-col items-center">
            <p className="stat-figure">24h</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-2">
              Design to print
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
