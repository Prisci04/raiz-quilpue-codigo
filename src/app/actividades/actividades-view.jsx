"use client";

import { useState } from "react";
import Image from "next/image";
import ActivityCard from "@/components/actividades/ActivityCard";
import ActividadesCalendar from "@/components/actividades/ActividadesCalendar";
import ImagePlaceholder from "@/components/actividades/ImagePlaceholder";
import ViewTabs from "@/components/actividades/ViewTabs";
import Pagination from "@/components/Pagination";
const PAGE_SIZE = 3;

function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = String(dateString).split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(dateString).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return new Date(year, month - 1, day).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ActividadesView({ activities = [], error = "", initialView = "actividades" }) {
  const [view, setView] = useState(initialView);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
  });

  const totalPages = Math.max(1, Math.ceil(activities.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pageItems = activities.slice(
    safePageIndex * PAGE_SIZE,
    safePageIndex * PAGE_SIZE + PAGE_SIZE
  );

  const selectedActivity = activities.find(
    (activity) => activity.id === selectedActivityId
  );

  function goToPage(page) {
    const nextIndex = Math.min(Math.max(page - 1, 0), totalPages - 1);
    setPageIndex(nextIndex);
    document.getElementById("actividades-list")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleViewActivity(activityId) {
    setSelectedActivityId(activityId);
    setShowForm(false);
    setConfirmation("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleInscriptionSubmit(event) {
    event.preventDefault();

    if (!selectedActivity || selectedActivity.cupos <= 0) {
      setConfirmation("No quedan cupos disponibles para esta actividad.");
      return;
    }

    setConfirmation("¡Inscripción realizada correctamente!");
    setFormData({ nombre: "", apellido: "", email: "", telefono: "" });
  }

  const emptyMessage = error
    ? error
    : "Aún no hay actividades publicadas.";

  function handleViewChange(nextView) {
    setView(nextView);
    setPageIndex(0);
  }

  return (
    <main className="bg-[#e7dcd2] text-[#946541]">
      <section className="bg-[#bb9c82]/25">
        <div className="mx-auto max-w-[1200px] px-6 pt-16 pb-10 sm:px-8 sm:pt-20">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
            Talleres · Visitas · Conferencias
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2.5rem,5vw,3.8rem)] leading-none font-semibold text-[#704a31]">
            Actividades
          </h1>
          <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-[#946541]">
            Participa en talleres, visitas guiadas, conferencias y festivales que
            conectan a la comunidad de Quilpué con su patrimonio.
          </p>

        </div>
      </section>

      <ViewTabs
        value={view}
        onChange={handleViewChange}
        count={activities.length}
      />

      <section
        id="actividades-list"
        className="mx-auto max-w-[1200px] px-6 pt-12 pb-20 sm:px-8"
      >

        {activities.length === 0 ? (
          <div
            style={{
              background: "#e7dcd2",
              border: "1px solid rgba(187,156,130,0.7)",
              borderRadius: 2,
              padding: "56px 24px",
              textAlign: "center",
              color: "#946541",
              fontSize: 18,
            }}
          >
            {emptyMessage}
          </div>
        ) : view === "calendario" ? (
          <ActividadesCalendar
            activities={activities}
            onView={handleViewActivity}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
            }}
          >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 18,
              width: "100%",
            }}
          >
            {pageItems.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onView={handleViewActivity}
              />
            ))}
          </div>
          <Pagination
            currentPage={safePageIndex + 1}
            totalPages={totalPages}
            onPageChange={goToPage}
            label="Paginación de actividades"
            className="mt-8"
          />
          </div>
        )}
      </section>

      {selectedActivity ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
              background: "rgba(148,101,65,0.58)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 100,
          }}
          onClick={() => setSelectedActivityId(null)}
        >
          <div
            style={{
              width: "min(980px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#e7dcd2",
              borderRadius: 24,
              border: "1px solid rgba(187,156,130,0.7)",
              boxShadow: "0 28px 70px rgba(17,12,8,0.18)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedActivityId(null);
                  setShowForm(false);
                  setConfirmation("");
                }}
                style={{
                  position: "absolute",
                  top: 18,
                  right: 18,
                  zIndex: 2,
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: "rgba(231,220,210,0.95)",
                  border: "1px solid rgba(187,156,130,0.7)",
                  cursor: "pointer",
                  fontSize: 20,
                  color: "#704a31",
                }}
                aria-label="Cerrar detalle"
              >
                ×
              </button>
              {selectedActivity.image ? (
                <div style={{ position: "relative", width: "100%", height: 360 }}>
                  <Image
                    src={selectedActivity.image}
                    alt={selectedActivity.title}
                    fill
                    sizes="(max-width: 980px) 100vw, 980px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              ) : (
                <ImagePlaceholder height={360} />
              )}
            </div>

            <div style={{ padding: "28px 28px 32px" }}>
              <div
                style={{
                  color: "#704a31",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                {formatDate(selectedActivity.date)} · {selectedActivity.time}
              </div>

              <h2
                style={{
                  margin: "0 0 18px",
                  fontFamily: "Georgia, serif",
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  color: "#946541",
                }}
              >
                {selectedActivity.title}
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 18,
                  margin: "0 0 24px",
                  color: "#946541",
                  fontSize: 14,
                }}
              >
                <div>📍 {selectedActivity.location}</div>
                <div>📌 {selectedActivity.cupos} cupos</div>
              </div>

              <p
                style={{
                  margin: "0 0 22px",
                  lineHeight: 1.8,
                  color: "rgba(148,101,65,0.8)",
                  fontSize: 16,
                }}
              >
                {selectedActivity.fullDescription}
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  style={{
                    borderRadius: 999,
                    background: "#946541",
                    color: "#e7dcd2",
                    padding: "14px 22px",
                    fontSize: 12,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Inscribirme
                </button>
              </div>

              {showForm ? (
                <form
                  onSubmit={handleInscriptionSubmit}
                  style={{
                    marginTop: 24,
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(187,156,130,0.7)",
                    borderRadius: 18,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 16,
                    }}
                  >
                    <label style={{ display: "grid", gap: 8, fontSize: 13, color: "#946541" }}>
                      Nombre
                      <input
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleFormChange}
                        required
                        style={{
                          border: "1px solid rgba(187,156,130,0.7)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          background: "#e7dcd2",
                          color: "#946541",
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 8, fontSize: 13, color: "#946541" }}>
                      Apellido
                      <input
                        name="apellido"
                        value={formData.apellido}
                        onChange={handleFormChange}
                        required
                        style={{
                          border: "1px solid rgba(187,156,130,0.7)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          background: "#e7dcd2",
                          color: "#946541",
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 8, fontSize: 13, color: "#946541" }}>
                      Correo electrónico
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        required
                        style={{
                          border: "1px solid rgba(187,156,130,0.7)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          background: "#e7dcd2",
                          color: "#946541",
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 8, fontSize: 13, color: "#946541" }}>
                      Teléfono
                      <input
                        name="telefono"
                        type="tel"
                        value={formData.telefono}
                        onChange={handleFormChange}
                        required
                        style={{
                          border: "1px solid rgba(187,156,130,0.7)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          background: "#e7dcd2",
                          color: "#946541",
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 18 }}>
                    <button
                      type="submit"
                      style={{
                        borderRadius: 999,
                        background: "#e48d40",
                        color: "#e7dcd2",
                        padding: "13px 20px",
                        fontSize: 12,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      Confirmar inscripción
                    </button>

                    {confirmation ? (
                      <span
                        style={{
                          color: "#db700f",
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        {confirmation}
                      </span>
                    ) : null}
                  </div>
                </form>
              ) : confirmation ? (
                <div
                  style={{
                    marginTop: 20,
                    color: "#db700f",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {confirmation}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
