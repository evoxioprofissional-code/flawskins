import Image from "next/image";

// Hero limpo: só o banner da marca, largura total. Sem efeitos.
export function Hero() {
  return (
    <section className="w-full px-4 pt-4 sm:px-6">
      <div className="mx-auto overflow-hidden rounded-xl">
        <Image
          src="/banner.png"
          alt="Cloud Skins — comprou, chegou! Menor preço à sua disposição."
          width={1920}
          height={200}
          priority
          className="h-auto w-full"
        />
      </div>
    </section>
  );
}
