import { useEffect, useState } from "react";
import { cn } from "cn";
import { getJoinedDate, links } from "@/shared";
import { CONTACT_TEXTS } from "../../lib/contact-texts.constants";
import { FooterGroup } from "./FooterGroup";

type FooterProps = {
  className?: string;
};

export function Footer({ className }: FooterProps) {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions[] = [
      { month: "short", day: "numeric" },
      { hour: "numeric", minute: "numeric" },
    ];

    setCurrentTime(getJoinedDate(options));

    const interval = setInterval(() => {
      setCurrentTime(getJoinedDate(options));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <footer className={cn("footer__links absolute flex w-full flex-wrap px-paddingX mix-blend-difference", className)}>
      <div className="mx-auto flex w-full max-w-maxWidth gap-0 md:gap-12">
        <FooterGroup title={CONTACT_TEXTS.LABEL_LOCAL_TIME} className="hidden md:block" links={[{ href: "", text: currentTime }]} />
        <FooterGroup className="hidden md:block" title={CONTACT_TEXTS.LABEL_OPEN_SOURCE} isMagnetic={true} links={[{ href: links.sourceCode, text: CONTACT_TEXTS.LABEL_VIEW_ON_GITHUB }]} />

        <FooterGroup
          title={CONTACT_TEXTS.LABEL_SOCIALS}
          className="md:ml-auto"
          isMagnetic={true}
          links={[
            { href: links.email, text: CONTACT_TEXTS.LABEL_EMAIL },
            { href: links.twitter, text: CONTACT_TEXTS.LABEL_TWITTER },
            { href: links.telegram, text: CONTACT_TEXTS.LABEL_TELEGRAM },
            { href: links.github, text: CONTACT_TEXTS.LABEL_GITHUB },
          ]}
        />
      </div>
    </footer>
  );
}
