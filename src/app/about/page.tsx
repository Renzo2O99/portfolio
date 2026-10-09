"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "../work.css";
import "../header.css";
import { redirect } from "next/navigation";
import { Header } from "@/common";
import { Footer } from "@/modules/contact";
import { links } from "@/shared";

export default function WorkPage() {
  const [delay, setDelay] = useState(15);
  let timer: NodeJS.Timeout;
  useEffect(() => {
    if (delay !== 0) {
      timer = setTimeout(() => {
        setDelay(delay - 1);
      }, 1000);
    } else {
      redirect(links.linkedin);
    }

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <>
      <Header color="Light" />
      <div className="darkGradient flex h-screen w-screen flex-col items-center justify-center px-paddingX py-paddingY text-center text-lg text-colorSecondaryLight md:text-3xl">
        About page is not ready yet so you'll be redirected to my LinkedIn instead.
        <br />
        <span className="mt-5 text-xl text-colorLight ">In {delay} seconds</span>
        <Link href={links.home} className="mt-5 underline">
          Go Back
        </Link>
        <Footer className="bottom-0" />
      </div>
    </>
  );
}
