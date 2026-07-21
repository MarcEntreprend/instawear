// src/admin/emailMarketing/SharedComponents.tsx

// will do a file for all React.CSSProperties

//

// import React from "react";
// import { accentBtn, inputStyle, labelStyle } from "./sharedStyles";

// export function InputField({
//   label,
//   value,
//   onChange,
//   placeholder,
//   type = "text",
//   hint,
// }: {
//   label: string;
//   value: string;
//   onChange: (v: string) => void;
//   placeholder?: string;
//   type?: string;
//   hint?: string;
// }) {
//   return (
//     <div>
//       <label style={labelStyle}>{label}</label>
//       <input
//         type={type}
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         placeholder={placeholder}
//         style={inputStyle}
//       />
//       {hint && (
//         <p
//           style={{
//             fontSize: 11,
//             color: "var(--color-ink4)",
//             margin: "4px 0 0",
//           }}
//         >
//           {hint}
//         </p>
//       )}
//     </div>
//   );
// }

// export function EmptyPlaceholder({
//   icon,
//   title,
//   sub,
//   action,
// }: {
//   icon: React.ReactNode;
//   title: string;
//   sub: string;
//   action?: { label: string; onClick: () => void };
// }) {
//   return (
//     <div
//       style={{
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         gap: 12,
//         padding: "48px 24px",
//         borderRadius: 16,
//         border: "1px dashed var(--color-border)",
//         textAlign: "center",
//       }}
//     >
//       <div
//         style={{
//           width: 48,
//           height: 48,
//           borderRadius: 14,
//           background: "var(--color-surface2)",
//           color: "var(--color-ink4)",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//         }}
//       >
//         {icon}
//       </div>
//       <div>
//         <p
//           style={{
//             fontSize: 14,
//             fontWeight: 600,
//             color: "var(--color-ink2)",
//             margin: "0 0 3px",
//           }}
//         >
//           {title}
//         </p>
//         <p style={{ fontSize: 12.5, color: "var(--color-ink4)", margin: 0 }}>
//           {sub}
//         </p>
//       </div>
//       {action && (
//         <button onClick={action.onClick} style={accentBtn}>
//           {action.label}
//         </button>
//       )}
//     </div>
//   );
// }

// export function SkeletonSection() {
//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
//       {Array.from({ length: 3 }).map((_, i) => (
//         <div
//           key={i}
//           className="skeleton"
//           style={{ height: 72, borderRadius: 14 }}
//         />
//       ))}
//     </div>
//   );
// }
