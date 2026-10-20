import {



  ArrowRight,



  LockKeyhole,



  Mail,



  ShieldCheck,



  Sparkles,



} from "lucide-react";



import { FormEvent, useEffect, useRef, useState } from "react";



import { useNavigate } from "react-router-dom";



import api from "../lib/api";



import "./login-theme.css";







type LoginMode = "password" | "otp";







export default function Login() {



  const nav = useNavigate();







  const [mode, setMode] = useState<LoginMode>("password");



  const [email, setEmail] = useState("");



  const [pass, setPass] = useState("");



  const [otp, setOtp] = useState("");



  const [otpSent, setOtpSent] = useState(false);



  const [loading, setLoading] = useState(false);



  const [error, setError] = useState("");



  const [message, setMessage] = useState("");







  const canvasRef = useRef<HTMLCanvasElement | null>(null);







  useEffect(() => {



    const canvas = canvasRef.current;



    if (!canvas) return;







    const ctx = canvas.getContext("2d");



    if (!ctx) return;







    let animationFrame = 0;



    let width = 0;



    let height = 0;







    type Hub = {



      x: number;



      y: number;



      r: number;



      big: boolean;



      phase: number;



    };







    type Edge = [number, number];







    type Shipment = {



      a: number;



      b: number;



      t: number;



      speed: number;



    };







    let hubs: Hub[] = [];



    let edges: Edge[] = [];



    let shipments: Shipment[] = [];







    const reduceMotion = window.matchMedia(



      "(prefers-reduced-motion: reduce)"



    ).matches;







    const buildNetwork = () => {



      const count = Math.max(



        14,



        Math.round((width * height) / 26000)



      );







      hubs = [];



      edges = [];



      shipments = [];







      for (let i = 0; i < count; i++) {



        hubs.push({



          x: Math.random() * width,



          y: Math.random() * height,



          r: 2 + Math.random() * 2.5,



          big: Math.random() < 0.22,



          phase: Math.random() * Math.PI * 2,



        });



      }







      hubs.forEach((hub, index) => {



        hubs



          .map((other, otherIndex) => ({



            index: otherIndex,



            distance: Math.hypot(



              hub.x - other.x,



              hub.y - other.y



            ),



          }))



          .filter((item) => item.index !== index)



          .sort((a, b) => a.distance - b.distance)



          .slice(0, 2)



          .forEach((item) => {



            const exists = edges.some(



              ([a, b]) =>



                (a === index && b === item.index) ||



                (a === item.index && b === index)



            );







            if (!exists) {



              edges.push([index, item.index]);



            }



          });



      });







      const shipmentCount = Math.min(edges.length, 26);







      for (let i = 0; i < shipmentCount; i++) {



        const edge =



          edges[Math.floor(Math.random() * edges.length)];







        if (!edge) continue;







        const forward = Math.random() < 0.5;







        shipments.push({



          a: forward ? edge[0] : edge[1],



          b: forward ? edge[1] : edge[0],



          t: Math.random(),



          speed: 0.002 + Math.random() * 0.004,



        });



      }



    };







    const resize = () => {



      const ratio = Math.min(window.devicePixelRatio || 1, 2);







      width = window.innerWidth;



      height = window.innerHeight;







      canvas.width = width * ratio;



      canvas.height = height * ratio;



      canvas.style.width = `${width}px`;



      canvas.style.height = `${height}px`;







      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);







      buildNetwork();



    };







    const routePoint = (



      aIndex: number,



      bIndex: number,



      progress: number



    ) => {



      const a = hubs[aIndex];



      const b = hubs[bIndex];







      if (!a || !b) {



        return { x: 0, y: 0 };



      }







      const midX = b.x;



      const midY = a.y;







      const firstLength = Math.abs(midX - a.x);



      const secondLength = Math.abs(b.y - midY);



      const totalLength =



        firstLength + secondLength || 1;







      const distance = progress * totalLength;







      if (distance < firstLength) {



        return {



          x:



            a.x +



            (midX - a.x) *



              (distance / (firstLength || 1)),



          y: a.y,



        };



      }







      return {



        x: midX,



        y:



          midY +



          (b.y - midY) *



            ((distance - firstLength) /



              (secondLength || 1)),



      };



    };







    const draw = () => {



      ctx.clearRect(0, 0, width, height);







      // Background grid



      ctx.strokeStyle = "rgba(94,234,212,.045)";



      ctx.lineWidth = 1;



      ctx.beginPath();







      for (let x = 0; x < width; x += 56) {



        ctx.moveTo(x, 0);



        ctx.lineTo(x, height);



      }







      for (let y = 0; y < height; y += 56) {



        ctx.moveTo(0, y);



        ctx.lineTo(width, y);



      }







      ctx.stroke();







      // Logistics routes



      ctx.strokeStyle = "rgba(94,234,212,.16)";



      ctx.lineWidth = 1.2;







      edges.forEach(([aIndex, bIndex]) => {



        const a = hubs[aIndex];



        const b = hubs[bIndex];







        if (!a || !b) return;







        ctx.beginPath();



        ctx.moveTo(a.x, a.y);



        ctx.lineTo(b.x, a.y);



        ctx.lineTo(b.x, b.y);



        ctx.stroke();



      });







      // Logistics hubs



      hubs.forEach((hub) => {



        if (!reduceMotion) {



          hub.phase += 0.02;



        }







        ctx.beginPath();



        ctx.arc(



          hub.x,



          hub.y,



          hub.r,



          0,



          Math.PI * 2



        );







        ctx.fillStyle = hub.big



          ? "#5eead4"



          : "rgba(190,235,240,.5)";







        ctx.fill();







        if (hub.big) {



          ctx.beginPath();



          ctx.arc(



            hub.x,



            hub.y,



            hub.r * 2.4 +



              Math.sin(hub.phase) * 2.5,



            0,



            Math.PI * 2



          );







          ctx.strokeStyle = "rgba(94,234,212,.25)";



          ctx.stroke();



        }



      });







      // Moving shipments



      shipments.forEach((shipment, index) => {



        if (!reduceMotion) {



          shipment.t += shipment.speed;



        }







        if (shipment.t >= 1) {



          const edge =



            edges[



              Math.floor(



                Math.random() * edges.length



              )



            ];







          if (edge) {



            const forward = Math.random() < 0.5;







            shipments[index] = {



              a: forward ? edge[0] : edge[1],



              b: forward ? edge[1] : edge[0],



              t: 0,



              speed:



                0.002 + Math.random() * 0.004,



            };



          }







          return;



        }







        const point = routePoint(



          shipment.a,



          shipment.b,



          Math.min(shipment.t, 1)



        );







        const glow = ctx.createRadialGradient(



          point.x,



          point.y,



          0,



          point.x,



          point.y,



          10



        );







        glow.addColorStop(



          0,



          "rgba(94,234,212,.9)"



        );



        glow.addColorStop(



          1,



          "rgba(94,234,212,0)"



        );







        ctx.fillStyle = glow;



        ctx.beginPath();



        ctx.arc(



          point.x,



          point.y,



          10,



          0,



          Math.PI * 2



        );



        ctx.fill();







        ctx.fillStyle = "#fff";



        ctx.fillRect(



          point.x - 2,



          point.y - 2,



          4,



          4



        );



      });







      if (!reduceMotion) {



        animationFrame =



          requestAnimationFrame(draw);



      }



    };







    resize();



    draw();







    const handleResize = () => {



      resize();







      if (reduceMotion) {



        draw();



      }



    };







    window.addEventListener("resize", handleResize);







    return () => {



      window.removeEventListener(



        "resize",



        handleResize



      );



      cancelAnimationFrame(animationFrame);



    };



  }, []);







  const saveSession = (data: any) => {



    localStorage.setItem(



      "logiforge_token",



      data.token



    );







    localStorage.setItem(



      "logiforge_user",



      JSON.stringify(data.user)



    );







    nav("/dashboard");



  };







  const passwordLogin = async () => {



    if (!email.trim() || !pass.trim()) {



      setError(



        "Please enter your email and password."



      );



      return;



    }







    try {



      setLoading(true);







      const response = await api.post(



        "/auth/login",



        {



          email: email.trim(),



          password: pass,



        }



      );







      if (response.data.success) {



        saveSession(response.data);



      } else {



        setError(



          response.data.message ||



            "Login failed."



        );



      }



    } catch (err: any) {



      setError(



        err?.response?.data?.message ||



          "Unable to connect to LOGIFORGE backend."



      );



    } finally {



      setLoading(false);



    }



  };







  const sendOtp = async () => {



    if (!email.trim()) {



      setError(



        "Please enter your registered email."



      );



      return;



    }







    try {



      setLoading(true);



      setError("");



      setMessage("");







      const response = await api.post(



        "/auth/send-otp",



        {



          email: email.trim(),



        }



      );







      if (response.data.success) {



        setOtpSent(true);



        setMessage(



          "Verification code sent to your email."



        );



      } else {



        setError(



          response.data.message ||



            "Unable to send verification code."



        );



      }



    } catch (err: any) {



      setError(



        err?.response?.data?.message ||



          "Unable to send verification code."



      );



    } finally {



      setLoading(false);



    }



  };







  const verifyOtp = async () => {



    if (!email.trim() || !otp.trim()) {



      setError(



        "Please enter your email and OTP."



      );



      return;



    }







    if (!/^\d{6}$/.test(otp)) {



      setError(



        "OTP must be exactly 6 digits."



      );



      return;



    }







    try {



      setLoading(true);



      setError("");



      setMessage("");







      const response = await api.post(



        "/auth/verify-otp",



        {



          email: email.trim(),



          otp: otp.trim(),



        }



      );







      if (response.data.success) {



        saveSession(response.data);



      } else {



        setError(



          response.data.message ||



            "OTP verification failed."



        );



      }



    } catch (err: any) {



      setError(



        err?.response?.data?.message ||



          "OTP verification failed."



      );



    } finally {



      setLoading(false);



    }



  };







  const submit = async (e: FormEvent) => {



    e.preventDefault();







    setError("");



    setMessage("");







    if (mode === "password") {



      await passwordLogin();



    } else if (!otpSent) {



      await sendOtp();



    } else {



      await verifyOtp();



    }



  };







  const switchMode = (



    nextMode: LoginMode



  ) => {



    setMode(nextMode);



    setError("");



    setMessage("");



    setOtp("");



    setOtpSent(false);



  };







  return (



    <div className="lf-login-page">



      <canvas



        ref={canvasRef}



        className="lf-login-canvas"



        aria-hidden="true"



      />







      <main className="lf-login-card">



        <div className="lf-login-brand">



          <div className="lf-login-brand-icon">



            <svg



              viewBox="0 0 48 48"



              fill="none"



              aria-hidden="true"



            >



              <rect



                x="2"



                y="2"



                width="44"



                height="44"



                rx="13"



                fill="#0a2a33"



              />



              <path



                d="M13 31l11-14 11 14"



                stroke="#5eead4"



                strokeWidth="3.2"



                strokeLinecap="round"



                strokeLinejoin="round"



              />



              <circle



                cx="24"



                cy="17"



                r="3.4"



                fill="#fff"



              />



              <circle



                cx="13"



                cy="31"



                r="2.6"



                fill="#14899a"



              />



              <circle



                cx="35"



                cy="31"



                r="2.6"



                fill="#14899a"



              />



            </svg>



          </div>







          <div>



            <div className="lf-login-brand-name">



              logiforge



              <span>AI</span>



            </div>







            <div className="lf-login-brand-subtitle">



              Predictive logistics



            </div>



          </div>



        </div>







        <div className="lf-login-heading">



          <h1>Sign in</h1>



          <p>



            Access your LOGIFORGE AI command



            center.



          </p>



        </div>







        {error && (



          <div className="lf-login-message error">



            {error}



          </div>



        )}







        {message && (



          <div className="lf-login-message success">



            {message}



          </div>



        )}







        <div className="lf-login-mode">



          <button



            type="button"



            className={



              mode === "password"



                ? "active"



                : ""



            }



            onClick={() =>



              switchMode("password")



            }



          >



            Password



          </button>







          <button



            type="button"



            className={



              mode === "otp" ? "active" : ""



            }



            onClick={() => switchMode("otp")}



          >



            Email OTP



          </button>



        </div>







        <form



          className="lf-login-form"



          onSubmit={submit}



          noValidate



        >



          <div className="lf-login-field">



            <label htmlFor="login-email">



              Username or email



            </label>







            <div className="lf-login-input">



              <Mail size={17} />







              <input



                id="login-email"



                type="email"



                value={email}



                onChange={(e) =>



                  setEmail(e.target.value)



                }



                placeholder="Enter your registered email"



                autoComplete="off"



                name="login-username"



                spellCheck={false}



              />



            </div>



          </div>







          {mode === "password" && (



            <div className="lf-login-field">



              <label htmlFor="login-password">



                Password



              </label>







              <div className="lf-login-input">



                <LockKeyhole size={17} />







                <input



                  id="login-password"



                  type="password"



                  value={pass}



                  onChange={(e) =>



                    setPass(e.target.value)



                  }



                  placeholder="Enter your password"



                  autoComplete="new-password"



                  name="login-password"



                />



              </div>



            </div>



          )}







          {mode === "otp" && otpSent && (



            <div className="lf-login-field">



              <label htmlFor="login-otp">



                Verification code



              </label>







              <div className="lf-login-input">



                <ShieldCheck size={17} />







                <input



                  id="login-otp"



                  type="text"



                  inputMode="numeric"



                  maxLength={6}



                  value={otp}



                  onChange={(e) =>



                    setOtp(



                      e.target.value.replace(



                        /\D/g,



                        ""



                      )



                    )



                  }



                  placeholder="Enter 6-digit OTP"



                  autoComplete="one-time-code"



                  name="login-otp"



                />



              </div>







              <small className="lf-login-help">



                Code expires in 5 minutes.



              </small>



            </div>



          )}







          <button



            className="lf-login-submit"



            type="submit"



            disabled={loading}



          >



            <span>



              {loading



                ? mode === "otp" && !otpSent



                  ? "Sending code..."



                  : "Authenticating..."



                : mode === "password"



                ? "Sign in"



                : !otpSent



                ? "Send Verification Code"



                : "Verify & Sign In"}



            </span>







            {!loading && (



              <ArrowRight size={17} />



            )}



          </button>



        </form>







        {mode === "otp" && otpSent && (



          <button



            type="button"



            className="lf-resend"



            onClick={sendOtp}



            disabled={loading}



          >



            Didn't receive the code?{" "}



            <strong>Resend OTP</strong>



          </button>



        )}







        <div className="lf-login-security">



          <ShieldCheck size={16} />







          <div>



            <strong>



              Secure authentication



            </strong>







            <span>



              Your access is protected by



              encrypted session authentication.



            </span>



          </div>



        </div>







        <div className="lf-login-footer">



          <span>



            LOGIFORGE AI • DEMO ENVIRONMENT



          </span>







          <span>SIH 2026</span>



        </div>



      </main>







      <div className="lf-login-bottom">



        Intelligent Logistics • Predictive



        Decision Support



      </div>



    </div>



  );



}
