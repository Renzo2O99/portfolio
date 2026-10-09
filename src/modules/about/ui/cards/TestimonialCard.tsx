import type { TestimonialCardProps } from "../../models/about.types";

function TestimonialCard({ clientName, testimonial }: TestimonialCardProps) {
  return (
    <article className="swiper-slide mask rounded-3xl px-16 py-[1.5em] max-md:px-5 md:rounded-3xl md:py-[1.1em]">
      <div className="testimonialHeader flex items-center gap-[1em] md:block">
        <div className="h-[60px] w-[60px] rounded-full bg-colorLight md:mt-2.5 md:h-[106px] md:w-[106px]" />
        <p className="max-w-fit justify-center whitespace-nowrap rounded-(--radius) bg-colorSecondaryDark px-4 py-2 text-sm font-medium leading-5 tracking-normal text-colorLight md:mt-5">{clientName}</p>
      </div>
      <p className="mt-[1em] text-[0.8em] tracking-tight max-md:max-w-full">“{testimonial}”</p>
      <div className="absolute left-0 top-0 -z-10 h-full w-full bg-colorSecondaryLight opacity-80" />
    </article>
  );
}

export { TestimonialCard };
