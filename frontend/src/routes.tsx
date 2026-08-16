import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import BasicLayout from "./layout/BasicLayout";
import NotFoundPage from "./pages/error/NotFound";
import MainPage from "./pages/index";

const UploadPage = lazy(() => import("./pages/upload/index"));
const LoginPage = lazy(() => import("./pages/login/index"));
const MrfFilesPage = lazy(() => import("./pages/mrf/index"));

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
        element: (
          <Suspense>
            <UploadPage />
          </Suspense>
        ),
      },
      {
        path: "/login",
        element: (
          <Suspense>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: "/mrf",
        element: (
          <Suspense>
            <MrfFilesPage />
          </Suspense>
        ),
        loader: () => import("./pages/mrf/index").then((m) => m.mrfFilesLoader()),
      },
    ],
    errorElement: <NotFoundPage />,
  },
]);

export default router;
