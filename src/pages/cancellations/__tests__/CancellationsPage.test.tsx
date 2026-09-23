import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => ({
    can: () => true,
    isSuperAdmin: true,
    adminRole: { id: "role-1", name: "super_admin", permissions: [] },
    loading: false,
    setAdminRole: () => {},
  }),
}));

vi.mock("@/services/cancellationService", () => ({
  getCancellationRequests: vi.fn(),
  getCancellationRequest: vi.fn(),
  approveCancellationRequest: vi.fn(),
  rejectCancellationRequest: vi.fn(),
  batchApproveCancellationRequests: vi.fn(),
  decisionErrorInfo: vi.fn(() => ({ message: "error", conflict: false })),
}));

import {
  approveCancellationRequest,
  getCancellationRequest,
  getCancellationRequests,
  rejectCancellationRequest,
} from "@/services/cancellationService";
import type { CancellationListResult, CancellationRequest } from "@/types/cancellation";
import CancellationsPage from "../CancellationsPage";

const pendingRequest: CancellationRequest = {
  id: "req-1",
  status: "PENDING_APPROVAL",
  bookingId: "bk-1",
  booking: {
    id: "bk-1",
    bookingNumber: "TA-1001",
    status: "CONFIRMED",
    paymentStatus: "SUCCEEDED",
    grossAmount: 1000,
    currency: "USD",
    travelDate: "2026-10-01T00:00:00.000Z",
    customer: { id: "c1", name: "Ama Mensah", email: "ama@example.com" },
    refundStatus: null,
    refundAmount: null,
  },
  tour: {
    id: "t1",
    title: "Cape Coast Adventure",
    supplier: { id: "s1", name: "Accra Tours" },
  },
  supplier: { id: "s1", name: "Accra Tours", email: "ops@accra.test" },
  payload: {
    cancellationCategory: "SUPPLIER",
    cancellationCode: "SUP-01",
    explanation: "Vehicle broke down",
    agreedToTerms: true,
    customerRefundAgreed: true,
  },
  preview: { refund: { amount: 750, note: "75% refund" }, fee: 250, countsTowardRate: true },
  stopSellingApplied: true,
  decidedBy: null,
  decidedAt: null,
  decisionNote: null,
  createdAt: "2026-09-20T10:00:00.000Z",
};

function listResult(requests: CancellationRequest[], pendingCount = requests.length): CancellationListResult {
  return {
    requests,
    pendingCount,
    pagination: { currentPage: 1, totalPages: 1, totalCount: requests.length, limit: 20 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCancellationRequests).mockResolvedValue(listResult([pendingRequest], 3));
  vi.mocked(getCancellationRequest).mockResolvedValue({
    ...pendingRequest,
    payload: { ...pendingRequest.payload, supplierNotes: "Handled via phone" },
  });
  vi.mocked(approveCancellationRequest).mockResolvedValue({
    request: { ...pendingRequest, status: "APPROVED" },
    cancellation: { refundAmount: 750, refundStatus: "PROCESSING", fee: 250 },
  });
  vi.mocked(rejectCancellationRequest).mockResolvedValue({
    request: { ...pendingRequest, status: "REJECTED" },
  });
});

describe("CancellationsPage", () => {
  it("renders the queue with request rows and the pending count", async () => {
    renderWithProviders(<CancellationsPage />);

    expect(await screen.findByText("TA-1001")).toBeInTheDocument();
    expect(screen.getByText("Cape Coast Adventure")).toBeInTheDocument();
    expect(screen.getAllByText("Accra Tours").length).toBeGreaterThan(0);
    expect(screen.getByText("3 pending")).toBeInTheDocument();
    expect(screen.getByText("Vehicle broke down")).toBeInTheDocument();
    expect(getCancellationRequests).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PENDING_APPROVAL", page: 1 }),
    );
  });

  it("renders the empty state when there are no requests", async () => {
    vi.mocked(getCancellationRequests).mockResolvedValue(listResult([], 0));
    renderWithProviders(<CancellationsPage />);
    expect(
      await screen.findByText("No cancellation requests in this view."),
    ).toBeInTheDocument();
  });

  it("renders the error state when the queue fails to load", async () => {
    vi.mocked(getCancellationRequests).mockRejectedValueOnce(new Error("boom"));
    renderWithProviders(<CancellationsPage />);
    expect(
      await screen.findByText(/Failed to load cancellation requests/),
    ).toBeInTheDocument();
  });

  it("honours the ?request= deep link and loads the detail", async () => {
    renderWithProviders(<CancellationsPage />, {
      initialEntries: ["/cancellations?request=req-1"],
    });

    expect(await screen.findByText("Handled via phone")).toBeInTheDocument();
    expect(getCancellationRequest).toHaveBeenCalledWith("req-1");
  });

  it("approves a request after confirming the full-refund warning", async () => {
    renderWithProviders(<CancellationsPage />);

    const bookingCell = await screen.findByText("TA-1001");
    const row = bookingCell.closest("tr") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: "Approve" }));

    expect(await screen.findByText(/FULL customer refund/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /Approve & refund customer/i }),
    );

    await waitFor(() => {
      expect(approveCancellationRequest).toHaveBeenCalledWith("req-1", "");
    });
  });

  it("requires a rejection reason of at least 3 characters", async () => {
    renderWithProviders(<CancellationsPage />);

    const bookingCell = await screen.findByText("TA-1001");
    const row = bookingCell.closest("tr") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: "Reject" }));

    const confirm = await screen.findByRole("button", { name: /Reject request/i });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Rejection reason"), "no");
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Rejection reason"), "t valid");
    expect(confirm).toBeEnabled();

    await userEvent.click(confirm);
    await waitFor(() => {
      expect(rejectCancellationRequest).toHaveBeenCalledWith("req-1", "not valid");
    });
  });
});
