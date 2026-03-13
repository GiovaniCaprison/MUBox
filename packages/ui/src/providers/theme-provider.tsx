import { applyMode, Mode } from "@cloudscape-design/global-styles";
import { type FunctionComponent, type ReactNode, createContext, useCallback, useEffect, useState } from "react";

const IS_DARK_MODE_LOCAL_STORAGE_KEY = "IS_DARK_MODE_LOCAL_STORAGE_KEY";

const initialState = {
  isDarkMode: true,
  setIsDarkMode: (val: boolean): void => {}, // eslint-disable-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
};

const CLASS_NAME_LIGHT = "light";
const CLASS_NAME_DARK = "dark";

export const DarkModeContext = createContext(initialState);

interface Props {
  readonly children: ReactNode;
}

export const ThemeProvider: FunctionComponent<Props> = ({ children }) => {
  const [isDarkMode, setIsDarkModeInState] = useState(false); // Default theme is light

  const setIsDarkModeInStateAndInCSS = useCallback(
    (newIsDarkMode: boolean) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      [document.documentElement, document.getElementById("app")!].forEach((element) => {
        element.classList.add(newIsDarkMode ? CLASS_NAME_DARK : CLASS_NAME_LIGHT);
        element.classList.remove(newIsDarkMode ? CLASS_NAME_LIGHT : CLASS_NAME_DARK);
      });

      applyMode(isDarkMode ? Mode.Dark : Mode.Light);
      setIsDarkModeInState(newIsDarkMode);
    },
    [isDarkMode],
  );

  // On mount, read the preferred theme from local storage
  useEffect(() => {
    const isDarkModeFromLocalStorage = localStorage.getItem(IS_DARK_MODE_LOCAL_STORAGE_KEY) === "true";
    setIsDarkModeInStateAndInCSS(isDarkModeFromLocalStorage);
  }, [setIsDarkModeInState, setIsDarkModeInStateAndInCSS]);

  // Sets IsDarkMode both in local storage and in the state
  const setIsDarkMode = (val: boolean): void => {
    localStorage.setItem(IS_DARK_MODE_LOCAL_STORAGE_KEY, JSON.stringify(val));
    setIsDarkModeInStateAndInCSS(val);
  };

  return <DarkModeContext.Provider value={{ isDarkMode, setIsDarkMode }}>{children}</DarkModeContext.Provider>;
};
