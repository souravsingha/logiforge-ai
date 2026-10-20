import { useEffect, useMemo, useState } from "react";

import {
  CheckCircle2,
  Clock3,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
} from "lucide-react";

import api from "../lib/api";


// ======================================================
// TYPES
// ======================================================

type Location = {
  id: string;
  code: string;
  name: string;
};

type Item = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
};

type SupplyRequest = {
  id: string;

  request_code: string;

  location_id: string;
  item_id: string;

  quantity: number | string;

  required_by: string;

  priority:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL"
    | string;

  reason: string;

  status: string;

  location_code?: string;
  location_name?: string;

  item_code?: string;
  item_name?: string;

  category?: string;

  created_at: string;
};


// ======================================================
// CONSTANTS
// ======================================================

const STATUS_OPTIONS = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "PLANNED",
  "APPROVED",
  "IN_TRANSIT",
  "DELIVERED",
  "CLOSED",
  "CANCELLED",
];


// ======================================================
// COMPONENT
// ======================================================

export default function Requests() {

  // ====================================================
  // STATE
  // ====================================================

  const [requests, setRequests] =
    useState<SupplyRequest[]>([]);

  const [locations, setLocations] =
    useState<Location[]>([]);

  const [items, setItems] =
    useState<Item[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [updating, setUpdating] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [priorityFilter, setPriorityFilter] =
    useState("ALL");

  const [form, setForm] = useState({
    locationId: "",
    itemId: "",
    quantity: "",
    requiredBy: "",
    priority: "MEDIUM",
    reason: "",
  });


  // ====================================================
  // LOAD REQUESTS
  // ====================================================

  const loadRequests = async () => {

    try {

      setLoading(true);
      setError("");

      const response =
        await api.get("/requests");

      setRequests(
        response.data?.data || []
      );

    } catch (err: any) {

      console.error(
        "Request loading error:",
        err
      );

      if (
        err?.response?.status === 401
      ) {

        localStorage.removeItem(
          "logiforge_token"
        );

        localStorage.removeItem(
          "logiforge_user"
        );

        window.location.href =
          "/login";

        return;
      }

      setError(
        err?.response?.data?.message ||
          "Unable to load supply requests."
      );

    } finally {

      setLoading(false);
    }
  };


  // ====================================================
  // LOAD LOCATIONS + ITEMS
  // ====================================================

  const loadFormData = async () => {

    try {

      const [
        locationsResponse,
        itemsResponse,
      ] = await Promise.all([
        api.get("/locations"),
        api.get("/items"),
      ]);

      setLocations(
        locationsResponse.data?.data || []
      );

      setItems(
        itemsResponse.data?.data || []
      );

    } catch (err: any) {

      console.error(
        "Request form data error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to load locations and items."
      );
    }
  };


  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {

    loadRequests();
    loadFormData();

  }, []);


  // ====================================================
  // CREATE REQUEST
  // ====================================================

  const createRequest = async (
    event: React.FormEvent
  ) => {

    event.preventDefault();

    if (!form.locationId) {

      setError(
        "Please select a location."
      );

      return;
    }

    if (!form.itemId) {

      setError(
        "Please select an item."
      );

      return;
    }

    if (
      !form.quantity ||
      Number(form.quantity) <= 0
    ) {

      setError(
        "Please enter a valid quantity."
      );

      return;
    }

    if (!form.requiredBy) {

      setError(
        "Please select required-by date."
      );

      return;
    }

    if (
      form.reason.trim().length < 3
    ) {

      setError(
        "Please provide a valid reason."
      );

      return;
    }

    try {

      setCreating(true);
      setError("");

      await api.post(
        "/requests",
        {
          locationId:
            form.locationId,

          itemId:
            form.itemId,

          quantity:
            Number(form.quantity),

          requiredBy:
            form.requiredBy,

          priority:
            form.priority,

          reason:
            form.reason.trim(),
        }
      );

      setForm({
        locationId: "",
        itemId: "",
        quantity: "",
        requiredBy: "",
        priority: "MEDIUM",
        reason: "",
      });

      setShowForm(false);

      await loadRequests();

    } catch (err: any) {

      console.error(
        "Create request error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to create supply request."
      );

    } finally {

      setCreating(false);
    }
  };


  // ====================================================
  // UPDATE REQUEST STATUS
  // ====================================================

  const updateStatus = async (
    id: string,
    status: string
  ) => {

    try {

      setUpdating(id);
      setError("");

      await api.patch(
        `/requests/${id}/status`,
        {
          status,
        }
      );

      await loadRequests();

    } catch (err: any) {

      console.error(
        "Status update error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to update request status."
      );

    } finally {

      setUpdating(null);
    }
  };


  // ====================================================
  // VALID NEXT STATUS
  // ====================================================

  const getNextStatuses = (
    currentStatus: string
  ) => {

    const transitions: Record<
      string,
      string[]
    > = {

      DRAFT: [
        "SUBMITTED",
        "CANCELLED",
      ],

      SUBMITTED: [
        "UNDER_REVIEW",
        "CANCELLED",
      ],

      UNDER_REVIEW: [
        "PLANNED",
        "CANCELLED",
      ],

      PLANNED: [
        "APPROVED",
        "CANCELLED",
      ],

      APPROVED: [
        "IN_TRANSIT",
        "CANCELLED",
      ],

      IN_TRANSIT: [
        "DELIVERED",
      ],

      DELIVERED: [
        "CLOSED",
      ],

      CLOSED: [],

      CANCELLED: [],
    };

    return (
      transitions[currentStatus] ||
      []
    );
  };


  // ====================================================
  // FILTER REQUESTS
  // ====================================================

  const filteredRequests =
    useMemo(() => {

      return requests.filter(
        (request) => {

          const statusMatch =
            statusFilter === "ALL" ||
            request.status ===
              statusFilter;

          const priorityMatch =
            priorityFilter === "ALL" ||
            request.priority ===
              priorityFilter;

          return (
            statusMatch &&
            priorityMatch
          );
        }
      );

    }, [
      requests,
      statusFilter,
      priorityFilter,
    ]);


  // ====================================================
  // KPI
  // ====================================================

  const stats =
    useMemo(() => {

      return {

        total:
          requests.length,

        critical:
          requests.filter(
            (r) =>
              r.priority ===
              "CRITICAL"
          ).length,

        pending:
          requests.filter(
            (r) =>
              r.status ===
                "SUBMITTED" ||
              r.status ===
                "UNDER_REVIEW"
          ).length,

        approved:
          requests.filter(
            (r) =>
              r.status ===
                "APPROVED" ||
              r.status ===
                "IN_TRANSIT"
          ).length,
      };

    }, [requests]);


  // ====================================================
  // PRIORITY CLASS
  // ====================================================

  const priorityClass = (
    priority: string
  ) => {

    if (
      priority === "CRITICAL"
    ) {
      return "red";
    }

    if (
      priority === "HIGH"
    ) {
      return "amber";
    }

    return "green";
  };


  // ====================================================
  // STATUS CLASS
  // ====================================================

  const statusClass = (
    status: string
  ) => {

    if (
      status === "CANCELLED"
    ) {
      return "red";
    }

    if (
      status === "APPROVED" ||
      status === "IN_TRANSIT" ||
      status === "DELIVERED" ||
      status === "CLOSED"
    ) {
      return "green";
    }

    return "amber";
  };


  // ====================================================
  // FORMAT DATE
  // ====================================================

  const formatDate = (
    value: string
  ) => {

    if (!value) {
      return "-";
    }

    return new Date(
      value
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };


  // ====================================================
  // RENDER
  // ====================================================

  return (

    <section
      className="dashboard-page"
    >

      <div
        className="dashboard-inner"
      >


        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="dash-head">

          <div>

            <span className="eyebrow">
              SUPPLY CHAIN
            </span>

            <h1>
              Supply Requests
            </h1>

            <p>
              Create, prioritize and
              track forward supply
              requirements.
            </p>

          </div>


          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >

            <button
              className="outline-btn"
              onClick={
                loadRequests
              }
              disabled={loading}
            >

              <RefreshCw
                size={15}
                className={
                  loading
                    ? "spin"
                    : ""
                }
              />

              Refresh

            </button>


            <button
              className="primary-btn"
              onClick={() =>
                setShowForm(
                  !showForm
                )
              }
            >

              <Plus
                size={15}
              />

              New Request

            </button>

          </div>

        </div>


        {/* ==========================================
            ERROR
        ========================================== */}

        {error && (

          <div
            className="human-note"
            style={{
              marginBottom: 16,
              borderColor:
                "#ef4444",
            }}
          >

            {error}

          </div>

        )}


        {/* ==========================================
            KPI CARDS
        ========================================== */}

        <div className="stat-grid">


          <div className="stat-card">

            <div className="stat-icon">

              <PackageCheck
                size={18}
              />

            </div>

            <span>
              Total Requests
            </span>

            <strong>
              {stats.total}
            </strong>

            <small>
              All supply requests
            </small>

          </div>


          <div className="stat-card">

            <div className="stat-icon">

              <Send
                size={18}
              />

            </div>

            <span>
              Pending Review
            </span>

            <strong>
              {stats.pending}
            </strong>

            <small>
              Awaiting planner action
            </small>

          </div>


          <div className="stat-card">

            <div className="stat-icon">

              <Clock3
                size={18}
              />

            </div>

            <span>
              Critical
            </span>

            <strong>
              {stats.critical}
            </strong>

            <small>
              Highest priority
            </small>

          </div>


          <div className="stat-card">

            <div className="stat-icon">

              <CheckCircle2
                size={18}
              />

            </div>

            <span>
              Approved / Transit
            </span>

            <strong>
              {stats.approved}
            </strong>

            <small>
              Active fulfillment
            </small>

          </div>

        </div>


        {/* ==========================================
            CREATE REQUEST FORM
        ========================================== */}

        {showForm && (

          <div
            className="panel"
            style={{
              marginBottom: 18,
            }}
          >

            <div className="panel-head">

              <div>

                <h3>
                  Create Supply Request
                </h3>

                <span>
                  Submit a new forward
                  supply requirement
                </span>

              </div>

            </div>


            <form
              onSubmit={
                createRequest
              }
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 16,
              }}
            >


              {/* LOCATION */}

              <label>

                <span
                  style={{
                    display:
                      "block",
                    marginBottom: 7,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Location
                </span>

                <select
                  value={
                    form.locationId
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      locationId:
                        e.target.value,
                    })
                  }
                  style={inputStyle}
                >

                  <option value="">
                    Select location
                  </option>

                  {locations.map(
                    (location) => (

                      <option
                        key={
                          location.id
                        }
                        value={
                          location.id
                        }
                      >

                        {location.code}
                        {" — "}
                        {location.name}

                      </option>

                    )
                  )}

                </select>

              </label>


              {/* ITEM */}

              <label>

                <span
                  style={{
                    display:
                      "block",
                    marginBottom: 7,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Item
                </span>

                <select
                  value={
                    form.itemId
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      itemId:
                        e.target.value,
                    })
                  }
                  style={inputStyle}
                >

                  <option value="">
                    Select item
                  </option>

                  {items.map(
                    (item) => (

                      <option
                        key={item.id}
                        value={item.id}
                      >

                        {item.name}
                        {" — "}
                        {item.category}

                      </option>

                    )
                  )}

                </select>

              </label>


              {/* QUANTITY */}

              <label>

                <span
                  style={{
                    display:
                      "block",
                    marginBottom: 7,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Quantity
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    form.quantity
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      quantity:
                        e.target.value,
                    })
                  }
                  placeholder="Enter quantity"
                  style={inputStyle}
                />

              </label>


              {/* REQUIRED BY */}

              <label>

                <span
                  style={{
                    display:
                      "block",
                    marginBottom: 7,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Required By
                </span>

                <input
                  type="date"
                  value={
                    form.requiredBy
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requiredBy:
                        e.target.value,
                    })
                  }
                  style={inputStyle}
                />

              </label>


              {/* PRIORITY */}

              <label>

                <span
                  style={{
                    display:
                      "block",
                    marginBottom: 7,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Priority
                </span>

                <select
                  value={
                    form.priority
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priority:
                        e.target.value,
                    })
                  }
                  style={inputStyle}
                >

                  <option value="LOW">
                    LOW
                  </option>

                  <option value="MEDIUM">
                    MEDIUM
                  </option>

                  <option value="HIGH">
                    HIGH
                  </option>

                  <option value="CRITICAL">
                    CRITICAL
                  </option>

                </select>

              </label>


              {/* REASON */}

              <label>

                <span
                  style={{
                    display:
                      "block",
                    marginBottom: 7,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Reason
                </span>

                <input
                  type="text"
                  value={
                    form.reason
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reason:
                        e.target.value,
                    })
                  }
                  placeholder="Why is this supply required?"
                  style={inputStyle}
                />

              </label>


              {/* ACTIONS */}

              <div
                style={{
                  gridColumn:
                    "1 / -1",

                  display:
                    "flex",

                  justifyContent:
                    "flex-end",

                  gap: 8,
                }}
              >

                <button
                  type="button"
                  className="outline-btn"
                  onClick={() =>
                    setShowForm(false)
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="primary-btn"
                  disabled={creating}
                >

                  <Send
                    size={15}
                  />

                  {creating
                    ? "Submitting..."
                    : "Submit Request"}

                </button>

              </div>

            </form>

          </div>

        )}


        {/* ==========================================
            REQUEST QUEUE
        ========================================== */}

        <div className="panel">

          <div className="panel-head">

            <div>

              <h3>
                Supply Request Queue
              </h3>

              <span>
                Prioritized logistics
                requirements
              </span>

            </div>


            {/* FILTERS */}

            <div
              style={{
                display:
                  "flex",

                gap: 8,

                flexWrap:
                  "wrap",
              }}
            >

              <select
                value={
                  priorityFilter
                }
                onChange={(e) =>
                  setPriorityFilter(
                    e.target.value
                  )
                }
                style={
                  smallSelectStyle
                }
              >

                <option value="ALL">
                  All Priorities
                </option>

                <option value="CRITICAL">
                  Critical
                </option>

                <option value="HIGH">
                  High
                </option>

                <option value="MEDIUM">
                  Medium
                </option>

                <option value="LOW">
                  Low
                </option>

              </select>


              <select
                value={
                  statusFilter
                }
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                style={
                  smallSelectStyle
                }
              >

                <option value="ALL">
                  All Status
                </option>

                {STATUS_OPTIONS.map(
                  (status) => (

                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>

                  )
                )}

              </select>

            </div>

          </div>


          {/* LOADING */}

          {loading ? (

            <div
              style={{
                padding:
                  "45px 20px",

                textAlign:
                  "center",

                color:
                  "var(--muted)",
              }}
            >
              Loading supply requests...
            </div>

          ) : filteredRequests.length === 0 ? (

            <div
              style={{
                padding:
                  "55px 20px",

                textAlign:
                  "center",
              }}
            >

              <PackageCheck
                size={38}
                style={{
                  opacity:
                    0.6,
                }}
              />

              <h3>
                No supply requests
              </h3>

              <p
                style={{
                  color:
                    "var(--muted)",
                }}
              >
                Create a new request
                or change the filters.
              </p>

            </div>

          ) : (

            <div
              style={{
                overflowX:
                  "auto",
              }}
            >

              <table
                style={{
                  width:
                    "100%",

                  borderCollapse:
                    "collapse",

                  minWidth:
                    1050,
                }}
              >

                <thead>

                  <tr>

                    {[
                      "Request",
                      "Location",
                      "Item",
                      "Quantity",
                      "Required By",
                      "Priority",
                      "Status",
                      "Action",
                    ].map(
                      (heading) => (

                        <th
                          key={heading}
                          style={
                            thStyle
                          }
                        >
                          {heading}
                        </th>

                      )
                    )}

                  </tr>

                </thead>


                <tbody>

                  {filteredRequests.map(
                    (request) => (

                      <tr
                        key={
                          request.id
                        }
                      >

                        {/* REQUEST */}

                        <td
                          style={
                            tdStyle
                          }
                        >

                          <b>
                            {
                              request.request_code
                            }
                          </b>

                          <div
                            style={{
                              fontSize:
                                11,

                              color:
                                "var(--muted)",

                              marginTop:
                                4,
                            }}
                          >
                            {formatDate(
                              request.created_at
                            )}
                          </div>

                        </td>


                        {/* LOCATION */}

                        <td
                          style={
                            tdStyle
                          }
                        >

                          <b>
                            {
                              request.location_code
                            }
                          </b>

                          <div
                            style={{
                              fontSize:
                                11,

                              color:
                                "var(--muted)",

                              marginTop:
                                3,
                            }}
                          >
                            {
                              request.location_name
                            }
                          </div>

                        </td>


                        {/* ITEM */}

                        <td
                          style={
                            tdStyle
                          }
                        >

                          <b>
                            {
                              request.item_name
                            }
                          </b>

                          <div
                            style={{
                              fontSize:
                                11,

                              color:
                                "var(--muted)",

                              marginTop:
                                3,
                            }}
                          >
                            {
                              request.category
                            }
                          </div>

                        </td>


                        {/* QUANTITY */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {Number(
                            request.quantity
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </td>


                        {/* REQUIRED BY */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {formatDate(
                            request.required_by
                          )}
                        </td>


                        {/* PRIORITY */}

                        <td
                          style={
                            tdStyle
                          }
                        >

                          <span
                            className={
                              `inventory-status ${priorityClass(
                                request.priority
                              )}`
                            }
                          >
                            {
                              request.priority
                            }
                          </span>

                        </td>


                        {/* STATUS */}

                        <td
                          style={
                            tdStyle
                          }
                        >

                          <span
                            className={
                              `inventory-status ${statusClass(
                                request.status
                              )}`
                            }
                          >
                            {
                              request.status
                            }
                          </span>

                        </td>


                        {/* ACTION */}

                        <td
                          style={
                            tdStyle
                          }
                        >

                          {request.status !==
                            "CLOSED" &&
                            request.status !==
                              "CANCELLED" && (

                              <select
                                value={
                                  request.status
                                }

                                disabled={
                                  updating ===
                                  request.id
                                }

                                onChange={(
                                  e
                                ) =>
                                  updateStatus(
                                    request.id,
                                    e.target
                                      .value
                                  )
                                }

                                style={{
                                  ...smallSelectStyle,
                                  minWidth:
                                    160,
                                }}
                              >

                                <option
                                  value={
                                    request.status
                                  }
                                >
                                  {
                                    request.status
                                  }
                                </option>


                                {getNextStatuses(
                                  request.status
                                ).map(
                                  (status) => (

                                    <option
                                      key={
                                        status
                                      }
                                      value={
                                        status
                                      }
                                    >
                                      {status}
                                    </option>

                                  )
                                )}

                              </select>

                            )}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* ==========================================
            HUMAN REVIEW
        ========================================== */}

        <div
          className="human-note"
        >

          <b>
            Supply workflow:
          </b>{" "}

          Requests are submitted with
          a required-by date, priority
          and operational reason.
          Planners can review the queue
          and move requests through
          planning, approval, transit
          and delivery stages.

        </div>

      </div>

    </section>
  );
}


// ======================================================
// STYLES
// ======================================================

const inputStyle:
  React.CSSProperties = {

  width: "100%",

  padding:
    "10px 12px",

  borderRadius: 8,

  border:
    "1px solid var(--line)",

  background:
    "var(--surface)",

  color:
    "var(--text)",

  outline: "none",

  fontSize: 13,
};


const smallSelectStyle:
  React.CSSProperties = {

  padding:
    "8px 10px",

  borderRadius: 8,

  border:
    "1px solid var(--line)",

  background:
    "var(--surface)",

  color:
    "var(--text)",

  outline: "none",

  fontSize: 12,
};


const thStyle:
  React.CSSProperties = {

  textAlign: "left",

  padding:
    "11px 10px",

  borderBottom:
    "1px solid var(--line)",

  color:
    "var(--muted)",

  fontSize: 11,

  textTransform:
    "uppercase",

  letterSpacing:
    "0.05em",
};


const tdStyle:
  React.CSSProperties = {

  padding:
    "13px 10px",

  borderBottom:
    "1px solid var(--line)",

  fontSize: 13,

  verticalAlign:
    "top",
};