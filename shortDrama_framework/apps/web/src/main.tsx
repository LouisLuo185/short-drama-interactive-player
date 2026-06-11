import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AdminImportPage } from "./app/routes/AdminImportPage";
import { DramaDetailPage } from "./app/routes/DramaDetailPage";
import { DramasPage } from "./app/routes/DramasPage";
import { WatchPage } from "./app/routes/WatchPage";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dramas" replace /> },
  { path: "/admin/import", element: <AdminImportPage /> },
  { path: "/dramas", element: <DramasPage /> },
  { path: "/dramas/:dramaId", element: <DramaDetailPage /> },
  { path: "/watch/:episodeId", element: <WatchPage /> }
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
