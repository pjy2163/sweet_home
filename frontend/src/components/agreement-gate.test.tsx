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
    vi.clearAllMocks();
    api.fetchAuthSession.mockResolvedValue({ authenticated: true, provider: "google" });
    api.fetchAgreementStatus.mockResolvedValue({
      accepted: false,
      terms_version: "2026-07-15",
      privacy_notice_version: "2026-07-18",
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

  it("does not expose an internal JSON parsing error to the user", async () => {
    const user = userEvent.setup();
    api.acceptCurrentAgreement.mockRejectedValue(
      new SyntaxError("Failed to execute 'json' on 'Response': Unexpected end of JSON input"),
    );
    render(<AgreementGate redirectPath="/mypage" />);

    await screen.findByRole("button", { name: "동의하고 계속하기" });
    const checks = screen.getAllByRole("checkbox");
    await user.click(checks[0]);
    await user.click(checks[1]);
    await user.click(screen.getByRole("button", { name: "동의하고 계속하기" }));

    expect(await screen.findByText(
      "동의 내용을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    )).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected end of JSON input/i)).not.toBeInTheDocument();
  });
});
