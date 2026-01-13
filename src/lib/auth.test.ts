import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signInWithGoogle, setupAuthListener, refreshSession } from "./auth";
import { supabaseClient } from "../db/supabase.client";

// Mock supabaseClient
vi.mock("../db/supabase.client", () => ({
  supabaseClient: {
    auth: {
      signInWithOAuth: vi.fn(),
      onAuthStateChange: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

// Mock window.location
const mockLocation = {
  href: "",
  origin: "https://example.com",
};
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
  configurable: true,
});

// Mock console methods
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = "";
    mockLocation.origin = "https://example.com";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("signInWithGoogle", () => {
    it("should initiate Google OAuth with default redirect", async () => {
      const mockData = { provider: "google", url: "https://oauth.url" };

      vi.mocked(supabaseClient.auth.signInWithOAuth).mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await signInWithGoogle();

      expect(supabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: "https://example.com/auth/callback",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      expect(result).toEqual(mockData);
    });

    it("should use custom redirectTo when provided", async () => {
      const customRedirect = "https://example.com/custom/callback?returnTo=/profile";
      const mockData = { provider: "google", url: "https://oauth.url" };

      vi.mocked(supabaseClient.auth.signInWithOAuth).mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      await signInWithGoogle(customRedirect);

      expect(supabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: customRedirect,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
    });

    it("should include offline access_type in query params", async () => {
      vi.mocked(supabaseClient.auth.signInWithOAuth).mockResolvedValueOnce({
        data: { provider: "google", url: "https://oauth.url" },
        error: null,
      });

      await signInWithGoogle();

      const callArgs = vi.mocked(supabaseClient.auth.signInWithOAuth).mock.calls[0][0];
      expect(callArgs.options?.queryParams?.access_type).toBe("offline");
    });

    it("should include consent prompt in query params", async () => {
      vi.mocked(supabaseClient.auth.signInWithOAuth).mockResolvedValueOnce({
        data: { provider: "google", url: "https://oauth.url" },
        error: null,
      });

      await signInWithGoogle();

      const callArgs = vi.mocked(supabaseClient.auth.signInWithOAuth).mock.calls[0][0];
      expect(callArgs.options?.queryParams?.prompt).toBe("consent");
    });

    it("should use window.location.origin for default redirect", async () => {
      mockLocation.origin = "https://custom-domain.com";

      vi.mocked(supabaseClient.auth.signInWithOAuth).mockResolvedValueOnce({
        data: { provider: "google", url: "https://oauth.url" },
        error: null,
      });

      await signInWithGoogle();

      const callArgs = vi.mocked(supabaseClient.auth.signInWithOAuth).mock.calls[0][0];
      expect(callArgs.options?.redirectTo).toBe("https://custom-domain.com/auth/callback");
    });

    it("should throw error when OAuth initiation fails", async () => {
      const mockError = {
        message: "OAuth error",
        status: 400,
      };

      vi.mocked(supabaseClient.auth.signInWithOAuth).mockResolvedValueOnce({
        data: { provider: "google", url: null },
        error: mockError,
      });

      await expect(signInWithGoogle()).rejects.toEqual(mockError);
    });

    it("should log error to console when OAuth fails", async () => {
      const mockError = {
        message: "OAuth error",
        status: 400,
      };

      vi.mocked(supabaseClient.auth.signInWithOAuth).mockResolvedValueOnce({
        data: { provider: "google", url: null },
        error: mockError,
      });

      try {
        await signInWithGoogle();
      } catch {
        // Expected to throw
      }

      expect(mockConsoleError).toHaveBeenCalledWith("OAuth initiation error:", mockError);
    });

    it("should return data on successful OAuth initiation", async () => {
      const mockData = {
        provider: "google",
        url: "https://accounts.google.com/oauth",
      };

      vi.mocked(supabaseClient.auth.signInWithOAuth).mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await signInWithGoogle();

      expect(result).toEqual(mockData);
    });
  });

  describe("setupAuthListener", () => {
    it("should register auth state change listener", () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(supabaseClient.auth.onAuthStateChange).mockReturnValueOnce({
        data: { subscription: { id: "test-sub" } },
      } as any);

      setupAuthListener();

      expect(supabaseClient.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
      expect(supabaseClient.auth.onAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should redirect to home on SIGNED_OUT event", () => {
      let callback: (event: string, session: any) => void = () => {};

      vi.mocked(supabaseClient.auth.onAuthStateChange).mockImplementationOnce((cb) => {
        callback = cb;
        return { data: { subscription: { id: "test-sub" } } } as any;
      });

      setupAuthListener();

      // Trigger SIGNED_OUT event
      callback("SIGNED_OUT", null);

      expect(mockLocation.href).toBe("/");
    });

    it("should log message on TOKEN_REFRESHED event", () => {
      let callback: (event: string, session: any) => void = () => {};

      vi.mocked(supabaseClient.auth.onAuthStateChange).mockImplementationOnce((cb) => {
        callback = cb;
        return { data: { subscription: { id: "test-sub" } } } as any;
      });

      setupAuthListener();

      // Trigger TOKEN_REFRESHED event
      callback("TOKEN_REFRESHED", { access_token: "new-token" });

      expect(mockConsoleLog).toHaveBeenCalledWith("Session refreshed successfully");
    });

    it("should log message on USER_UPDATED event", () => {
      let callback: (event: string, session: any) => void = () => {};

      vi.mocked(supabaseClient.auth.onAuthStateChange).mockImplementationOnce((cb) => {
        callback = cb;
        return { data: { subscription: { id: "test-sub" } } } as any;
      });

      setupAuthListener();

      // Trigger USER_UPDATED event
      callback("USER_UPDATED", { user: { id: "user-id" } });

      expect(mockConsoleLog).toHaveBeenCalledWith("User data updated");
    });

    it("should not redirect on TOKEN_REFRESHED event", () => {
      let callback: (event: string, session: any) => void = () => {};

      vi.mocked(supabaseClient.auth.onAuthStateChange).mockImplementationOnce((cb) => {
        callback = cb;
        return { data: { subscription: { id: "test-sub" } } } as any;
      });

      setupAuthListener();

      mockLocation.href = "";

      // Trigger TOKEN_REFRESHED event
      callback("TOKEN_REFRESHED", { access_token: "new-token" });

      expect(mockLocation.href).toBe("");
    });

    it("should not redirect on USER_UPDATED event", () => {
      let callback: (event: string, session: any) => void = () => {};

      vi.mocked(supabaseClient.auth.onAuthStateChange).mockImplementationOnce((cb) => {
        callback = cb;
        return { data: { subscription: { id: "test-sub" } } } as any;
      });

      setupAuthListener();

      mockLocation.href = "";

      // Trigger USER_UPDATED event
      callback("USER_UPDATED", { user: { id: "user-id" } });

      expect(mockLocation.href).toBe("");
    });

    it("should handle unknown events gracefully", () => {
      let callback: (event: string, session: any) => void = () => {};

      vi.mocked(supabaseClient.auth.onAuthStateChange).mockImplementationOnce((cb) => {
        callback = cb;
        return { data: { subscription: { id: "test-sub" } } } as any;
      });

      setupAuthListener();

      // Trigger unknown event
      expect(() => {
        callback("UNKNOWN_EVENT", null);
      }).not.toThrow();
    });

    it("should handle SIGNED_IN event without action", () => {
      let callback: (event: string, session: any) => void = () => {};

      vi.mocked(supabaseClient.auth.onAuthStateChange).mockImplementationOnce((cb) => {
        callback = cb;
        return { data: { subscription: { id: "test-sub" } } } as any;
      });

      setupAuthListener();

      mockLocation.href = "";

      // Trigger SIGNED_IN event
      callback("SIGNED_IN", { access_token: "token" });

      // Should not redirect or log
      expect(mockLocation.href).toBe("");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe("refreshSession", () => {
    it("should refresh session successfully", async () => {
      const mockSession = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        user: { id: "user-id" },
      };

      vi.mocked(supabaseClient.auth.refreshSession).mockResolvedValueOnce({
        data: { session: mockSession, user: { id: "user-id" } },
        error: null,
      });

      const result = await refreshSession();

      expect(supabaseClient.auth.refreshSession).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSession);
    });

    it("should return null when refresh fails", async () => {
      const mockError = {
        message: "Refresh token expired",
        status: 401,
      };

      vi.mocked(supabaseClient.auth.refreshSession).mockResolvedValueOnce({
        data: { session: null, user: null },
        error: mockError,
      });

      const result = await refreshSession();

      expect(result).toBeNull();
    });

    it("should log error to console when refresh fails", async () => {
      const mockError = {
        message: "Refresh token expired",
        status: 401,
      };

      vi.mocked(supabaseClient.auth.refreshSession).mockResolvedValueOnce({
        data: { session: null, user: null },
        error: mockError,
      });

      await refreshSession();

      expect(mockConsoleError).toHaveBeenCalledWith("Session refresh failed:", mockError);
    });

    it("should handle null session in response", async () => {
      vi.mocked(supabaseClient.auth.refreshSession).mockResolvedValueOnce({
        data: { session: null, user: null },
        error: null,
      });

      const result = await refreshSession();

      expect(result).toBeNull();
    });

    it("should return session with all expected fields", async () => {
      const mockSession = {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
        expires_at: 1234567890,
        token_type: "bearer",
        user: {
          id: "user-id",
          email: "user@example.com",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: "2024-01-01T00:00:00Z",
        },
      };

      vi.mocked(supabaseClient.auth.refreshSession).mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      const result = await refreshSession();

      expect(result).toEqual(mockSession);
      expect(result?.access_token).toBe("access-token");
      expect(result?.refresh_token).toBe("refresh-token");
      expect(result?.user.id).toBe("user-id");
    });

    it("should handle network errors gracefully", async () => {
      vi.mocked(supabaseClient.auth.refreshSession).mockRejectedValueOnce(new Error("Network error"));

      await expect(refreshSession()).rejects.toThrow("Network error");
    });
  });

  describe("Integration scenarios", () => {
    it("should handle sign in followed by auth listener setup", async () => {
      const mockData = { provider: "google", url: "https://oauth.url" };

      vi.mocked(supabaseClient.auth.signInWithOAuth).mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      vi.mocked(supabaseClient.auth.onAuthStateChange).mockReturnValueOnce({
        data: { subscription: { id: "test-sub" } },
      } as any);

      // Sign in
      const signInResult = await signInWithGoogle();
      expect(signInResult).toEqual(mockData);

      // Setup listener
      setupAuthListener();
      expect(supabaseClient.auth.onAuthStateChange).toHaveBeenCalled();
    });

    it("should handle refresh after sign in", async () => {
      const mockSession = {
        access_token: "token",
        refresh_token: "refresh",
        user: { id: "user-id" },
      };

      vi.mocked(supabaseClient.auth.signInWithOAuth).mockResolvedValueOnce({
        data: { provider: "google", url: "https://oauth.url" },
        error: null,
      });

      vi.mocked(supabaseClient.auth.refreshSession).mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      // Sign in
      await signInWithGoogle();

      // Later refresh
      const refreshedSession = await refreshSession();
      expect(refreshedSession).toEqual(mockSession);
    });

    it("should handle sign out via auth listener", () => {
      let callback: (event: string, session: any) => void = () => {};

      vi.mocked(supabaseClient.auth.onAuthStateChange).mockImplementationOnce((cb) => {
        callback = cb;
        return { data: { subscription: { id: "test-sub" } } } as any;
      });

      setupAuthListener();

      mockLocation.href = "/profile";

      // Simulate sign out
      callback("SIGNED_OUT", null);

      expect(mockLocation.href).toBe("/");
    });
  });

  describe("Edge cases", () => {
    it("should use default redirect when empty string provided", async () => {
      vi.mocked(supabaseClient.auth.signInWithOAuth).mockResolvedValueOnce({
        data: { provider: "google", url: "https://oauth.url" },
        error: null,
      });

      await signInWithGoogle("");

      const callArgs = vi.mocked(supabaseClient.auth.signInWithOAuth).mock.calls[0][0];
      // Empty string is falsy, so it falls back to default
      expect(callArgs.options?.redirectTo).toBe("https://example.com/auth/callback");
    });

    it("should handle redirectTo with query parameters", async () => {
      const redirectWithParams = "https://example.com/callback?foo=bar&baz=qux";

      vi.mocked(supabaseClient.auth.signInWithOAuth).mockResolvedValueOnce({
        data: { provider: "google", url: "https://oauth.url" },
        error: null,
      });

      await signInWithGoogle(redirectWithParams);

      const callArgs = vi.mocked(supabaseClient.auth.signInWithOAuth).mock.calls[0][0];
      expect(callArgs.options?.redirectTo).toBe(redirectWithParams);
    });

    it("should handle multiple auth listener setups", () => {
      vi.mocked(supabaseClient.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { id: "test-sub" } },
      } as any);

      setupAuthListener();
      setupAuthListener();
      setupAuthListener();

      expect(supabaseClient.auth.onAuthStateChange).toHaveBeenCalledTimes(3);
    });

    it("should handle rapid session refresh calls", async () => {
      const mockSession = {
        access_token: "token",
        refresh_token: "refresh",
        user: { id: "user-id" },
      };

      vi.mocked(supabaseClient.auth.refreshSession).mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toEqual(mockSession);
      });
    });
  });
});
