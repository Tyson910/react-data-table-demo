import { createBrowserRouter } from "react-router-dom";
import BasicLayout from "./layout/BasicLayout";
import NotFoundPage from "./pages/error/NotFound";
import MainPage from "./pages/index";
import UploadPage from "./pages/upload/index";
import LoginPage from "./pages/login/index";

const router = createBrowserRouter([
  {
    element: <BasicLayout />,
    children: [
      {
        path: "/",
        element: <MainPage />,
      },
      {
        path: "/upload",
        element: <UploadPage />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
    ],
    errorElement: <NotFoundPage />,
  },
]);

export default router;
