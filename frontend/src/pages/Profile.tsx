import {
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import api from "../lib/api";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_at: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

function resolveAvatarUrl(value: string | null) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `${API_ORIGIN}${value}`;
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "DP"
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRole(role: string) {
  return role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function imageToDataUrl(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to read image"));
      image.src = objectUrl;
    });

    const maxDimension = 512;
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.width, image.height)
    );

    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is not available");
    }

    context.drawImage(image, 0, 0, width, height);

    let quality = 0.82;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);

    while (dataUrl.length > 900_000 && quality > 0.45) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/profile");

      if (response.data?.success) {
        setProfile(response.data.data);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function syncLocalUser(updated: Partial<ProfileData>) {
    try {
      const current = JSON.parse(
        localStorage.getItem("logiforge_user") || "{}"
      );

      localStorage.setItem(
        "logiforge_user",
        JSON.stringify({
          ...current,
          ...updated,
        })
      );

      window.dispatchEvent(
        new CustomEvent("logiforge_profile_updated")
      );
    } catch {
      // Ignore localStorage errors.
    }
  }

  async function handleAvatarChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    clearMessages();

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WEBP images are supported.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Please select an image smaller than 5 MB.");
      return;
    }

    try {
      setAvatarUploading(true);

      const avatarData = await imageToDataUrl(file);

      const response = await api.post("/profile/avatar", {
        avatarData,
      });

      if (response.data?.success) {
        const avatarUrl = response.data.data.avatarUrl;

        setProfile((previous) =>
          previous
            ? {
                ...previous,
                avatar_url: avatarUrl,
              }
            : previous
        );

        syncLocalUser({
          avatar_url: avatarUrl,
        });

        setSuccess("Profile picture updated successfully.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to update profile picture."
      );
    } finally {
      setAvatarUploading(false);
    }
  }

  async function requestEmailOtp() {
    clearMessages();

    if (!newEmail.trim()) {
      setError("Please enter your new email address.");
      return;
    }

    try {
      setEmailLoading(true);

      const response = await api.post("/profile/email/request", {
        newEmail: newEmail.trim(),
      });

      if (response.data?.success) {
        setEmailOtpSent(true);
        setSuccess("Verification code sent to your new email.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to send verification code."
      );
    } finally {
      setEmailLoading(false);
    }
  }

  async function verifyEmailOtp() {
    clearMessages();

    if (!/^\d{6}$/.test(emailOtp.trim())) {
      setError("OTP must be exactly 6 digits.");
      return;
    }

    try {
      setEmailLoading(true);

      const response = await api.post("/profile/email/verify", {
        newEmail: newEmail.trim(),
        otp: emailOtp.trim(),
      });

      if (response.data?.success) {
        const updated = response.data.data as ProfileData;

        setProfile(updated);

        if (response.data.token) {
          localStorage.setItem(
            "logiforge_token",
            response.data.token
          );
        }

        syncLocalUser({
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          avatar_url: updated.avatar_url,
        });

        setEmailOpen(false);
        setEmailOtpSent(false);
        setEmailOtp("");
        setNewEmail("");
        setSuccess("Email address updated successfully.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to verify email."
      );
    } finally {
      setEmailLoading(false);
    }
  }

  async function changePassword() {
    clearMessages();

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setError("Please fill all password fields.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setError("New password and confirm password must match.");
      return;
    }

    try {
      setPasswordLoading(true);

      const response = await api.patch("/profile/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      if (response.data?.success) {
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });

        setSuccess("Password changed successfully.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to change password."
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div
          style={{
            minHeight: "70vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Loader2
              size={20}
              style={{
                animation: "spin 1s linear infinite",
              }}
            />
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">ACCOUNT</div>
            <h1>My Profile</h1>
            <p>Unable to load your account profile.</p>
          </div>
        </div>

        <section className="panel">
          <div style={{ padding: "24px", color: "#ef4444" }}>
            {error || "Profile not found."}
          </div>
        </section>
      </div>
    );
  }

  const initials = getInitials(profile.name);
  const avatarUrl = resolveAvatarUrl(profile.avatar_url);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">ACCOUNT</div>
          <h1>My Profile</h1>
          <p>
            Manage your profile, email, password and account activity.
          </p>
        </div>

        <div className="status-badge success">
          <ShieldCheck size={14} />
          Account
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(239,68,68,.3)",
            background: "rgba(239,68,68,.08)",
            color: "#ef4444",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(94,234,212,.3)",
            background: "rgba(94,234,212,.08)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1fr) minmax(280px, 360px)",
          gap: "20px",
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* PROFILE PICTURE */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Profile Picture</h3>
                <span>Update your account avatar.</span>
              </div>
              <Camera size={20} />
            </div>

            <div
              style={{
                padding: "28px",
                display: "flex",
                alignItems: "center",
                gap: "24px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: "96px",
                  height: "96px",
                  borderRadius: "24px",
                  overflow: "hidden",
                  background: "var(--surface2)",
                  border: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: "30px",
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}
                  >
                    {initials}
                  </span>
                )}
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "16px",
                    marginBottom: "6px",
                  }}
                >
                  {profile.name}
                </div>

                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: "13px",
                    marginBottom: "14px",
                  }}
                >
                  JPG, PNG or WEBP • Image will be optimized automatically
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  className="secondary-btn"
                  disabled={avatarUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarUploading ? (
                    <Loader2
                      size={16}
                      style={{
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  ) : (
                    <Camera size={16} />
                  )}
                  {avatarUploading ? "Uploading..." : "Change Photo"}
                </button>
              </div>
            </div>
          </section>

          {/* ACCOUNT INFORMATION */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Account Information</h3>
                <span>Your registered account details.</span>
              </div>
              <UserRound size={20} />
            </div>

            <div style={{ padding: "20px" }}>
              {/* EMAIL */}
              <div
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "5px" }}>
                      Email
                    </div>
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: "13px",
                      }}
                    >
                      {profile.email}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setEmailOpen((value) => !value);
                      clearMessages();
                    }}
                  >
                    <Mail size={16} />
                    Update Email
                  </button>
                </div>

                {emailOpen && (
                  <div
                    style={{
                      marginTop: "18px",
                      padding: "16px",
                      borderRadius: "10px",
                      background: "var(--surface2)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    {!emailOtpSent ? (
                      <>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "8px",
                            fontWeight: 600,
                          }}
                        >
                          New Email
                        </label>

                        <input
                          type="email"
                          value={newEmail}
                          onChange={(event) =>
                            setNewEmail(event.target.value)
                          }
                          placeholder="Enter new email address"
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--line)",
                            background: "var(--surface)",
                            color: "var(--text)",
                            outline: "none",
                          }}
                        />

                        <button
                          type="button"
                          className="primary-btn"
                          disabled={emailLoading}
                          onClick={requestEmailOtp}
                          style={{ marginTop: "12px" }}
                        >
                          {emailLoading ? (
                            <Loader2
                              size={16}
                              style={{
                                animation: "spin 1s linear infinite",
                              }}
                            />
                          ) : (
                            <Mail size={16} />
                          )}
                          {emailLoading
                            ? "Sending..."
                            : "Send Verification Code"}
                        </button>
                      </>
                    ) : (
                      <>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "8px",
                            fontWeight: 600,
                          }}
                        >
                          Verification Code
                        </label>

                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={emailOtp}
                          onChange={(event) =>
                            setEmailOtp(
                              event.target.value.replace(/\D/g, "")
                            )
                          }
                          placeholder="Enter 6-digit OTP"
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--line)",
                            background: "var(--surface)",
                            color: "var(--text)",
                            outline: "none",
                          }}
                        />

                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            marginTop: "12px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            className="primary-btn"
                            disabled={emailLoading}
                            onClick={verifyEmailOtp}
                          >
                            {emailLoading ? (
                              <Loader2
                                size={16}
                                style={{
                                  animation: "spin 1s linear infinite",
                                }}
                              />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                            Verify & Update
                          </button>

                          <button
                            type="button"
                            className="secondary-btn"
                            disabled={emailLoading}
                            onClick={() => {
                              setEmailOtpSent(false);
                              setEmailOtp("");
                            }}
                          >
                            Change Email
                          </button>
                        </div>

                        <p
                          style={{
                            margin: "12px 0 0",
                            color: "var(--muted)",
                            fontSize: "12px",
                          }}
                        >
                          Verification code expires in 5 minutes.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ROLE */}
              <div style={{ padding: "16px 0" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "5px" }}>
                      Role
                    </div>
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: "13px",
                      }}
                    >
                      {formatRole(profile.role)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "7px 10px",
                      borderRadius: "7px",
                      border: "1px solid var(--line)",
                      color: "var(--muted)",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Lock size={13} />
                    Admin controlled
                  </div>
                </div>

                <p
                  style={{
                    margin: "10px 0 0",
                    color: "var(--muted)",
                    fontSize: "12px",
                  }}
                >
                  Your role can only be changed by a System Administrator.
                </p>
              </div>
            </div>
          </section>

          {/* CHANGE PASSWORD */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Change Password</h3>
                <span>Update your account password.</span>
              </div>
              <KeyRound size={20} />
            </div>

            <div style={{ padding: "20px" }}>
              <PasswordField
                label="Current Password"
                value={passwordForm.currentPassword}
                placeholder="Enter current password"
                visible={showCurrentPassword}
                onToggle={() =>
                  setShowCurrentPassword((value) => !value)
                }
                onChange={(value) =>
                  setPasswordForm((previous) => ({
                    ...previous,
                    currentPassword: value,
                  }))
                }
              />

              <PasswordField
                label="New Password"
                value={passwordForm.newPassword}
                placeholder="Enter new password"
                visible={showNewPassword}
                onToggle={() =>
                  setShowNewPassword((value) => !value)
                }
                onChange={(value) =>
                  setPasswordForm((previous) => ({
                    ...previous,
                    newPassword: value,
                  }))
                }
              />

              <PasswordField
                label="Confirm New Password"
                value={passwordForm.confirmPassword}
                placeholder="Confirm new password"
                visible={showConfirmPassword}
                onToggle={() =>
                  setShowConfirmPassword((value) => !value)
                }
                onChange={(value) =>
                  setPasswordForm((previous) => ({
                    ...previous,
                    confirmPassword: value,
                  }))
                }
              />

              <button
                type="button"
                className="primary-btn"
                disabled={passwordLoading}
                onClick={changePassword}
              >
                {passwordLoading ? (
                  <Loader2
                    size={16}
                    style={{
                      animation: "spin 1s linear infinite",
                    }}
                  />
                ) : (
                  <KeyRound size={16} />
                )}
                {passwordLoading
                  ? "Changing..."
                  : "Change Password"}
              </button>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* ACCOUNT ACTIVITY */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Account Activity</h3>
                <span>Recent authentication information.</span>
              </div>
              <ShieldCheck size={20} />
            </div>

            <div style={{ padding: "20px" }}>
              <InfoRow
                label="Last Login"
                value={formatDate(profile.last_login_at)}
              />

              <InfoRow
                label="IP Address"
                value={profile.last_login_ip || "Not available"}
                mono
              />

              <InfoRow
                label="Member Since"
                value={formatDate(profile.created_at)}
                last
              />
            </div>
          </section>

          {/* SECURITY STATUS */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Security</h3>
                <span>Account security status.</span>
              </div>
              <Lock size={20} />
            </div>

            <div style={{ padding: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px",
                  borderRadius: "9px",
                  background: "var(--surface2)",
                  border: "1px solid var(--line)",
                }}
              >
                <CheckCircle2 size={18} color="var(--accent)" />
                <div>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "13px",
                    }}
                  >
                    Password Protected
                  </strong>
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: "12px",
                    }}
                  >
                    Your account uses secure password authentication.
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
};

function PasswordField({
  label,
  value,
  placeholder,
  visible,
  onToggle,
  onChange,
}: PasswordFieldProps) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label
        style={{
          display: "block",
          marginBottom: "8px",
          fontWeight: 600,
        }}
      >
        {label}
      </label>

      <div style={{ position: "relative" }}>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "12px 44px 12px 14px",
            borderRadius: "8px",
            border: "1px solid var(--line)",
            background: "var(--surface2)",
            color: "var(--text)",
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "transparent",
            color: "var(--muted)",
            cursor: "pointer",
          }}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
};

function InfoRow({
  label,
  value,
  mono = false,
  last = false,
}: InfoRowProps) {
  return (
    <div
      style={{
        padding: "14px 0",
        borderBottom: last ? "none" : "1px solid var(--line)",
      }}
    >
      <div
        style={{
          color: "var(--muted)",
          fontSize: "12px",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <strong
        style={{
          fontSize: "14px",
          fontFamily: mono ? "monospace" : undefined,
          wordBreak: mono ? "break-all" : undefined,
        }}
      >
        {value}
      </strong>
    </div>
  );
}
