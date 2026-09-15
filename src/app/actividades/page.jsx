"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ACTIVIDADES_FILTERS,
  getStoredActivities,
  persistActivities,
} from "@/lib/actividades-mock";

const PAGE_SIZE = 6;

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getAvailableSpots(activity) {
  return Math.max(activity.cupos - activity.inscritos, 0);
}

function getOccupancy(activity) {
  if (!activity.cupos) return 0;
  return Math.min(100, Math.round((activity.inscritos / activity.cupos) * 100));
}

export default function ActividadesPage() {
  const [activities, setActivities] = useState(() => getStoredActivities());
  const [selectedFilter, setSelectedFilter] = useState("Todas");
  const [search, setSearch] = useState("");
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

  useEffect(() => {
    persistActivities(activities);
  }, [activities]);

  useEffect(() => {
    setPageIndex(0);
    setConfirmation("");
  }, [selectedFilter, search]);

  const filteredActivities = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return activities.filter((activity) => {
      const matchesSearch =
        !searchValue || activity.title.toLowerCase().includes(searchValue);
      const matchesFilter =
        selectedFilter === "Todas" || activity.category === selectedFilter;

      return matchesSearch && matchesFilter;
    });
  }, [activities, search, selectedFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pageItems = filteredActivities.slice(
    safePageIndex * PAGE_SIZE,
    safePageIndex * PAGE_SIZE + PAGE_SIZE
  );

  const firstIndex = filteredActivities.length
    ? safePageIndex * PAGE_SIZE + 1
    : 0;
  const lastIndex = filteredActivities.length
    ? Math.min((safePageIndex + 1) * PAGE_SIZE, filteredActivities.length)
    : 0;

  const selectedActivity = activities.find(
    (activity) => activity.id === selectedActivityId
  );

  function handleViewActivity(activityId) {
    setSelectedActivityId(activityId);
    setShowForm(false);
    setConfirmation("");
  }

  function handleRegister(activityId) {
    setSelectedActivityId(activityId);
    setShowForm(true);
    setConfirmation("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleInscriptionSubmit(event) {
    event.preventDefault();

    if (!selectedActivity || selectedActivity.inscritos >= selectedActivity.cupos) {
      setConfirmation("No quedan cupos disponibles para esta actividad.");
      return;
    }

    setActivities((current) =>
      current.map((activity) =>
        activity.id === selectedActivity.id
          ? {
              ...activity,
              inscritos: Math.min(activity.inscritos + 1, activity.cupos),
            }
          : activity
      )
    );

    setConfirmation("¡Inscripción realizada correctamente!");
    setFormData({ nombre: "", apellido: "", email: "", telefono: "" });
  }

  return (
    <main style={{ background: "#f6f1e8", color: "#3d2f24" }}>
      <section
        style={{
          background: "linear-gradient(180deg, rgba(44,26,14,0.03), rgba(44,26,14,0.01))",
          borderBottom: "1px solid rgba(61,47,36,0.12)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "72px 24px 48px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 24,
              alignItems: "end",
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: 700 }}>
              <div
                className="section-label"
                style={{
                  color: "#8a6f5c",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Museo Digital · Quilpué
              </div>
              <h1
                style={{
                  margin: "14px 0 18px",
                  fontFamily: "Georgia, serif",
                  fontSize: "clamp(2.7rem, 5vw, 5rem)",
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                  color: "#2c1a0e",
                }}
              >
                ACTIVIDADES
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: 700,
                  fontSize: 18,
                  lineHeight: 1.7,
                  color: "rgba(61,47,36,0.82)",
                }}
              >
                Participa en talleres, visitas guiadas, conferencias y actividades que
                conectan a la comunidad con su patrimonio.
              </p>
            </div>

            <div
              style={{
                width: "min(100%, 320px)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(255,255,255,0.35)",
                border: "1px solid rgba(61,47,36,0.12)",
                borderRadius: 999,
                padding: "10px 14px 10px 18px",
                boxShadow: "0 12px 32px rgba(44,26,14,0.04)",
              }}
            >
              <span style={{ fontSize: 18, opacity: 0.8 }}>⌕</span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar actividad..."
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#3d2f24",
                  fontSize: 14,
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 30,
            }}
          >
            {ACTIVIDADES_FILTERS.map((filter) => {
              const active = filter === selectedFilter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedFilter(filter)}
                  style={{
                    borderRadius: 999,
                    border: active
                      ? "1px solid rgba(180,90,60,0.3)"
                      : "1px solid rgba(61,47,36,0.14)",
                    background: active ? "#b45a3c" : "rgba(255,255,255,0.25)",
                    color: active ? "#fff" : "#3d2f24",
                    padding: "9px 16px",
                    fontSize: 12,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: active ? "0 12px 24px rgba(180,90,60,0.15)" : "none",
                  }}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            marginBottom: 26,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8a6f5c",
            }}
          >
            {filteredActivities.length === 0
              ? "0 actividades"
              : `${firstIndex}–${lastIndex} de ${filteredActivities.length} actividades`}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
              disabled={safePageIndex === 0 || filteredActivities.length === 0}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "1px solid rgba(61,47,36,0.16)",
                background: safePageIndex === 0 || filteredActivities.length === 0 ? "#e7d9c9" : "#f9f4ee",
                color: safePageIndex === 0 || filteredActivities.length === 0 ? "rgba(61,47,36,0.45)" : "#2c1a0e",
                cursor: safePageIndex === 0 || filteredActivities.length === 0 ? "not-allowed" : "pointer",
                fontSize: 24,
                boxShadow: "0 10px 24px rgba(44,26,14,0.06)",
              }}
              aria-label="Actividades anteriores"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
              disabled={safePageIndex >= totalPages - 1 || filteredActivities.length === 0}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "1px solid rgba(61,47,36,0.16)",
                background: safePageIndex >= totalPages - 1 || filteredActivities.length === 0 ? "#e7d9c9" : "#b45a3c",
                color: safePageIndex >= totalPages - 1 || filteredActivities.length === 0 ? "rgba(61,47,36,0.45)" : "#fff",
                cursor: safePageIndex >= totalPages - 1 || filteredActivities.length === 0 ? "not-allowed" : "pointer",
                fontSize: 24,
                boxShadow: "0 10px 24px rgba(180,90,60,0.12)",
              }}
              aria-label="Siguientes actividades"
            >
              →
            </button>
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.3)",
              border: "1px solid rgba(61,47,36,0.1)",
              borderRadius: 20,
              padding: "56px 24px",
              textAlign: "center",
              color: "#3d2f24",
              fontSize: 18,
            }}
          >
            No encontramos actividades relacionadas con tu búsqueda.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 22,
            }}
          >
            {pageItems.map((activity) => {
              const available = getAvailableSpots(activity);
              const occupancy = getOccupancy(activity);

              return (
                <article
                  key={activity.id}
                  style={{
                    background: "rgba(255,255,255,0.26)",
                    border: "1px solid rgba(61,47,36,0.1)",
                    borderRadius: 18,
                    overflow: "hidden",
                    boxShadow: "0 20px 35px rgba(44,26,14,0.04)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                >
                  <div style={{ position: "relative", overflow: "hidden" }}>
                    <img
                      src={activity.image}
                      alt={activity.title}
                      style={{
                        width: "100%",
                        height: 230,
                        objectFit: "cover",
                        display: "block",
                        transform: "scale(1)",
                        transition: "transform 0.4s ease",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 14,
                        left: 14,
                        background: "#b45a3c",
                        color: "#fff",
                        fontSize: 9,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        padding: "7px 10px",
                        borderRadius: 999,
                      }}
                    >
                      {activity.category}
                    </div>
                  </div>

                  <div style={{ padding: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 11,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "#8a6f5c",
                        marginBottom: 12,
                      }}
                    >
                      <span>{formatDate(activity.date)}</span>
                      <span>{activity.time}</span>
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        fontSize: "1.5rem",
                        lineHeight: 1.15,
                        margin: "0 0 12px",
                        color: "#2c1a0e",
                      }}
                    >
                      {activity.title}
                    </h2>

                    <p
                      style={{
                        margin: "0 0 16px",
                        color: "rgba(61,47,36,0.75)",
                        lineHeight: 1.7,
                        fontSize: 15,
                      }}
                    >
                      {activity.description}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#5d493e",
                        fontSize: 14,
                        marginBottom: 12,
                      }}
                    >
                      <span>📍</span>
                      <span>{activity.location}</span>
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(61,47,36,0.72)",
                        marginBottom: 12,
                      }}
                    >
                      {activity.inscritos} inscritos · {available} cupos disponibles
                    </div>

                    <div
                      style={{
                        height: 7,
                        background: "#e9dcc4",
                        borderRadius: 999,
                        overflow: "hidden",
                        marginBottom: 18,
                      }}
                    >
                      <div
                        style={{
                          width: `${occupancy}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #b45a3c, #d79d5d)",
                          borderRadius: 999,
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 8,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleViewActivity(activity.id)}
                        style={{
                          background: "#f9f4ee",
                          border: "1px solid rgba(61,47,36,0.12)",
                          color: "#2c1a0e",
                          borderRadius: 999,
                          padding: "10px 16px",
                          fontSize: 12,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        Ver actividad
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRegister(activity.id)}
                        style={{
                          background: "#2c1a0e",
                          color: "#fff",
                          borderRadius: 999,
                          padding: "10px 16px",
                          fontSize: 12,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        Inscribirme
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedActivity ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(22,14,9,0.58)",
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
              background: "#f6f1e8",
              borderRadius: 24,
              border: "1px solid rgba(61,47,36,0.12)",
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
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(61,47,36,0.12)",
                  cursor: "pointer",
                  fontSize: 20,
                  color: "#2c1a0e",
                }}
                aria-label="Cerrar detalle"
              >
                ×
              </button>
              <img
                src={selectedActivity.image}
                alt={selectedActivity.title}
                style={{
                  width: "100%",
                  height: 360,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            <div style={{ padding: "28px 28px 32px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    background: "#b45a3c",
                    color: "#fff",
                    padding: "8px 12px",
                    borderRadius: 999,
                    fontSize: 10,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                >
                  {selectedActivity.category}
                </span>
                <div
                  style={{
                    color: "#8a6f5c",
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  {formatDate(selectedActivity.date)} · {selectedActivity.time}
                </div>
              </div>

              <h2
                style={{
                  margin: "0 0 18px",
                  fontFamily: "Georgia, serif",
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  color: "#2c1a0e",
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
                  color: "#5d493e",
                  fontSize: 14,
                }}
              >
                <div>📍 {selectedActivity.location}</div>
                <div>👥 {selectedActivity.inscritos} inscritos</div>
                <div>📌 {getAvailableSpots(selectedActivity)} cupos disponibles</div>
              </div>

              <p
                style={{
                  margin: "0 0 22px",
                  lineHeight: 1.8,
                  color: "rgba(61,47,36,0.8)",
                  fontSize: 16,
                }}
              >
                {selectedActivity.fullDescription}
              </p>

              <div
                style={{
                  background: "rgba(255,255,255,0.24)",
                  border: "1px solid rgba(61,47,36,0.1)",
                  borderRadius: 18,
                  padding: 18,
                  marginBottom: 22,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                    fontSize: 13,
                    color: "#3d2f24",
                  }}
                >
                  <span>Disponibilidad</span>
                  <strong>
                    {selectedActivity.inscritos}/{selectedActivity.cupos}
                  </strong>
                </div>
                <div
                  style={{
                    height: 10,
                    background: "#e7d7b8",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, getOccupancy(selectedActivity))}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #b45a3c, #d79d5d)",
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
                {selectedActivity.extras.map((extra) => (
                  <span
                    key={extra}
                    style={{
                      background: "rgba(180,90,60,0.08)",
                      border: "1px solid rgba(180,90,60,0.12)",
                      color: "#5d493e",
                      borderRadius: 999,
                      padding: "8px 12px",
                      fontSize: 12,
                    }}
                  >
                    {extra}
                  </span>
                ))}
              </div>

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
                    background: "#2c1a0e",
                    color: "#fff",
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
                    border: "1px solid rgba(61,47,36,0.12)",
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
                    <label style={{ display: "grid", gap: 8, fontSize: 13, color: "#3d2f24" }}>
                      Nombre
                      <input
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleFormChange}
                        required
                        style={{
                          border: "1px solid rgba(61,47,36,0.18)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          background: "#fff",
                          color: "#3d2f24",
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 8, fontSize: 13, color: "#3d2f24" }}>
                      Apellido
                      <input
                        name="apellido"
                        value={formData.apellido}
                        onChange={handleFormChange}
                        required
                        style={{
                          border: "1px solid rgba(61,47,36,0.18)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          background: "#fff",
                          color: "#3d2f24",
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 8, fontSize: 13, color: "#3d2f24" }}>
                      Correo electrónico
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        required
                        style={{
                          border: "1px solid rgba(61,47,36,0.18)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          background: "#fff",
                          color: "#3d2f24",
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 8, fontSize: 13, color: "#3d2f24" }}>
                      Teléfono
                      <input
                        name="telefono"
                        type="tel"
                        value={formData.telefono}
                        onChange={handleFormChange}
                        required
                        style={{
                          border: "1px solid rgba(61,47,36,0.18)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          background: "#fff",
                          color: "#3d2f24",
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 18 }}>
                    <button
                      type="submit"
                      style={{
                        borderRadius: 999,
                        background: "#b45a3c",
                        color: "#fff",
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
                          color: "#1d6d40",
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
                    color: "#1d6d40",
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
