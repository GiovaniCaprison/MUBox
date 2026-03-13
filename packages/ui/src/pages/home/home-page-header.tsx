import Button from "@cloudscape-design/components/button";
import { motion } from "motion/react";
import { useEffect, useState, type FunctionComponent } from "react";
import { useNavigate } from "react-router";

import { TuxedoIcon } from "./tuxedo-icon";
import { PageSectionBackground } from "@/components/page-section-background";
import { PageSectionContent } from "@/components/page-section-content";
import { ARCHITECTURE_ROUTE, QUICK_START_ROUTE, ROUTE_PATHS } from "@/routes";

export const websiteQualities = [
  { text: "Better", color: "text-primary" },
  { text: "Open", color: "text-blue-600" },
  { text: "Real", color: "text-red-600" },
  { text: "Scalable", color: "text-green-600" },
  { text: "Global", color: "text-teal-600" },
  { text: "Ambitious", color: "text-violet-600" },
  { text: "Collaborative", color: "text-orange-600" },
  { text: "Impactful", color: "text-pink-600" },
];

export const HomePageHeader: FunctionComponent = () => {
  const navigate = useNavigate();

  // These control the text animation
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [displayText, setDisplayText] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  useEffect(() => {
    const currentWord = websiteQualities[currentIndex].text;
    const typingSpeed = isDeleting ? 50 : 100;
    const pauseTime = isDeleting ? 500 : 2_000;

    const timeout = setTimeout(() => {
      if (!isDeleting && displayText === currentWord) {
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setCurrentIndex((prev) => (prev === websiteQualities.length - 1 ? 0 : prev + 1));
      } else {
        setDisplayText((prev) => (isDeleting ? prev.slice(0, -1) : currentWord.slice(0, prev.length + 1)));
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentIndex, displayText, isDeleting]);

  return (
    <PageSectionBackground color="header">
      <PageSectionContent className="mx-auto mt-20 flex grid-cols-2 flex-col py-24 md:grid">
        <div className="my-auto min-w-min text-center md:text-right">
          <h2 className="flex flex-col text-7xl whitespace-nowrap sm:block">
            <div>Host</div>
            <motion.div className={websiteQualities[currentIndex].color} key={currentIndex}>
              {displayText}
              <motion.div
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                className="ml-1 inline-block h-[1em] w-0.75 bg-gray-400 align-bottom"
              />
            </motion.div>
            <div>Resources</div>
          </h2>

          <div className="mt-4"></div>
          <span className="text-2xl">An open-source educational platform from Maynooth University</span>

          <div className="mt-8">
            <span className="mr-4">
              <Button iconName={QUICK_START_ROUTE.icon} onClick={() => void navigate(ROUTE_PATHS.QUICK_START)} variant="primary">
                Get Started
              </Button>
            </span>

            <Button iconName={ARCHITECTURE_ROUTE.icon} onClick={() => void navigate(ROUTE_PATHS.ARCHITECTURE)}>
              Architecture
            </Button>
          </div>
        </div>

        <TuxedoIcon />
      </PageSectionContent>
    </PageSectionBackground>
  );
};
