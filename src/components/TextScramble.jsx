import { useEffect, useState } from "react";

const CHARS = "!<>-_\\/[]{}—=+*^?#$%&@abcdefghijklmnopqrstuvwxyz";

export function TextScramble({ text, className, delay = 800 }) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    let done = false;
    let timeoutId;
    let blinkId;
    const targetChars = text.split("");
    let currentText = "";
    let targetIndex = 0;
    let phase = "typing";

    const randomChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];

    const show = (txt) => setDisplay(txt);

    const step = () => {
      if (done) return;

      if (phase === "typing") {
        if (targetIndex >= targetChars.length) {
          blinkId = setTimeout(() => show(currentText), 400);
          return;
        }
        const char = targetChars[targetIndex];
        if (char !== " " && Math.random() < 0.12) {
          currentText += randomChar();
          show(currentText + "|");
          phase = "fixing";
          timeoutId = setTimeout(step, 180 + Math.random() * 120);
        } else {
          currentText += char;
          targetIndex++;
          show(currentText + "|");
          timeoutId = setTimeout(step, 60 + Math.random() * 80);
        }
        return;
      }

      if (phase === "fixing") {
        currentText = currentText.slice(0, -1);
        show(currentText + "|");
        phase = "typing";
        timeoutId = setTimeout(step, 60 + Math.random() * 40);
        return;
      }
    };

    const start = setTimeout(step, delay);

    return () => {
      done = true;
      clearTimeout(start);
      clearTimeout(timeoutId);
      clearTimeout(blinkId);
    };
  }, [text, delay]);

  return <span className={className}>{display}</span>;
}
