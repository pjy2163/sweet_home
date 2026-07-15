import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgreementGate } from "./agreement-gate";

const api = vi.hoisted(() => ({
  fetchAuthSession: vi.fn(),
  fetchAgreementStatus: vi.fn(),
  acceptCurrentAgreement: vi.fn(),
}));

vi.mock("@/lib/api", () => api);

describe("AgreementGate", () => {
  beforeEach(() => {
    api.fetchAuthSession.mockResolvedValue({ authenticated: true, provider: "google" });
    api.fetchAgreementStatus.mockResolvedValue({
      accepted: false,
      terms_version: "2026-07-15",
      privacy_notice_version: "2026-07-15",
      accepted_at: null,
    });
  });

  it("requires both affirmative checks before continuing", async () => {
    const user = userEvent.setup();
    render(<AgreementGate redirectPath="/mypage" />);

    const button = await screen.findByRole("button", { name: "동의하고 계속하기" });
    expect(button).toBeDisabled();

    const checks = screen.getAllByRole("checkbox");
    await user.click(checks[0]);
    expect(button).toBeDisabled();
    await user.click(checks[1]);

    await waitFor(() => expect(button).toBeEnabled());
    expect(api.acceptCurrentAgreement).not.toHaveBeenCalled();
  });
});
