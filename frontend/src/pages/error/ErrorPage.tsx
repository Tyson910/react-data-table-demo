import { isRouteErrorResponse, useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();

  let status = 500;
  let message = "Something went wrong.";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    message = error.status === 404 ? "This page could not be found." : error.statusText;
  }

  return (
    <div className="flex h-screen items-center justify-center gap-4">
      <div className="font-semibold">{status}</div>
      <div className="h-5 w-[1px] bg-gray-500" />
      <div className="text-xs text-gray-400">{message}</div>
    </div>
  );
}
