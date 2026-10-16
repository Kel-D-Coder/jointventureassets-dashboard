import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import OverviewPage from "@/pages/OverviewPage";
import RequestsPage from "@/pages/RequestsPage";
import RequestDetailPage from "@/pages/RequestDetailPage";
import ListingsPage from "@/pages/ListingsPage";
import ListingEditorPage from "@/pages/ListingEditorPage";
import UsersPage from "@/pages/UsersPage";
import MessagesPage from "@/pages/MessagesPage";
import DraftsPage from "@/pages/DraftsPage";
import EnquiriesPage from "@/pages/EnquiriesPage";
import ListingRequestsPage from "@/pages/ListingRequestsPage";
import TemplatesPage from "@/pages/TemplatesPage";
import TemplateEditorPage from "@/pages/TemplateEditorPage";
import ClosedDealsPage from "@/pages/ClosedDealsPage";
import ClosedDealDetailPage from "@/pages/ClosedDealDetailPage";
import EnquiryDetailPage from "@/pages/EnquiryDetailPage";
import ListingRequestDetailPage from "@/pages/ListingRequestDetailPage";
import MemberDetailPage from "@/pages/MemberDetailPage";
import MessageDetailPage from "@/pages/MessageDetailPage";

/** Sends signed-out visitors to the login page, remembering where they were headed. */
function RequireSession({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireSession>
            <Layout />
          </RequireSession>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="requests/:requestId" element={<RequestDetailPage />} />
        <Route path="listings" element={<ListingsPage />} />
        <Route path="listings/new" element={<ListingEditorPage />} />
        <Route path="listings/:listingId" element={<ListingEditorPage />} />
        <Route path="drafts" element={<DraftsPage />} />
        <Route path="closed-deals" element={<ClosedDealsPage />} />
        <Route path="closed-deals/:listingId" element={<ClosedDealDetailPage />} />
        <Route path="enquiries" element={<EnquiriesPage />} />
        <Route path="enquiries/:enquiryId" element={<EnquiryDetailPage />} />
        <Route path="listing-requests" element={<ListingRequestsPage />} />
        <Route path="listing-requests/:submissionId" element={<ListingRequestDetailPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="templates/:templateId" element={<TemplateEditorPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:userId" element={<MemberDetailPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="messages/:messageId" element={<MessageDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
