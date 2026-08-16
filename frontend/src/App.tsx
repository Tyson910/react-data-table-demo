import { createTheme, MantineProvider } from "@mantine/core";
import { RouterProvider } from "react-router-dom";
import router from "./routes";

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <RouterProvider router={router} />
    </MantineProvider>
  );
}

const theme = createTheme({
  primaryColor: "royalGreen",
  primaryShade: 5,
  fontFamily: `"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif`,
  colors: {
    royalGreen: [
      "#00c207", // Lighter shade
      "#00a706",
      "#008b05",
      "#007404",
      "#005f03",
      "#004502", // Primary color
      "#003e02",
      "#003501",
      "#002d01", // Darker shade
      "#002d01", // Darker shade
    ],
  },
});
