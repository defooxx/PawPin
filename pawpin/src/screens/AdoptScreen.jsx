import { useEffect, useState, useRef } from "react";
import { Building2, Check, ChevronRight, Heart, HeartHandshake, ShieldCheck, X, Camera, Plus, Calendar, Clock } from "lucide-react";
import { ADOPTABLE_ANIMALS, fade } from "../data.js";
import {
  getAdoptableAnimals,
  createAdoptableAnimal,
  getAdoptionMeetings,
  createAdoptionMeeting,
  updateAdoptionMeeting,
} from "../services/api.js";

const MEETING_SLOTS = ["Sat 10:00 AM", "Sat 2:00 PM", "Sun 11:00 AM", "Sun 4:00 PM"];

export function AdoptScreen({ user, toast }) {
  const [favorites, setFavorites] = useState({});
  const [openIndex, setOpenIndex] = useState(null);
  const [meeting, setMeeting] = useState(false);
  const [slot, setSlot] = useState(null);
  const [done, setDone] = useState(false);

  // Database driven state
  const [animals, setAnimals] = useState([]);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  // Shelter dashboard states
  const [shelterTab, setShelterTab] = useState("animals"); // "animals" | "meetings"
  const [showAddPetModal, setShowAddPetModal] = useState(false);

  // Add pet form states
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState("dog");
  const [newPetBreed, setNewPetBreed] = useState("");
  const [newPetAge, setNewPetAge] = useState("");
  const [newPetSex, setNewPetSex] = useState("Female");
  const [newPetSize, setNewPetSize] = useState("Medium");
  const [newPetDescription, setNewPetDescription] = useState("");
  const [newPetPhoto, setNewPetPhoto] = useState("");
  const [newPetTags, setNewPetTags] = useState("");
  const [newPetHealth, setNewPetHealth] = useState("");
  const [submittingPet, setSubmittingPet] = useState(false);
  const petFileRef = useRef(null);

  const toggleFavorite = (id) => setFavorites((current) => ({ ...current, [id]: !current[id] }));

  const loadAnimals = async () => {
    setLoadingAnimals(true);
    try {
      const data = await getAdoptableAnimals();
      if (data && data.length > 0) {
        setAnimals(data);
      } else {
        // Fallback to mock data with mapped fields
        const mappedMock = ADOPTABLE_ANIMALS.map((a, i) => ({
          id: i + 1000,
          petName: a.name,
          species: a.name === "Luna" ? "cat" : "dog",
          age: a.age,
          description: a.about,
          photoUrl: "", // fallback to emoji
          emoji: a.emoji,
          bg: a.bg || "var(--amber-soft)",
          tags: a.tags,
          location: a.shelter,
          postedBy: a.shelter,
          posterId: 1,
          status: "available",
          breed: a.size,
          sex: a.sex,
          health: a.health
        }));
        setAnimals(mappedMock);
      }
    } catch (err) {
      console.error("Failed to load animals:", err);
      // Fallback
      setAnimals(ADOPTABLE_ANIMALS.map((a, i) => ({
        id: i + 1000,
        petName: a.name,
        species: a.name === "Luna" ? "cat" : "dog",
        age: a.age,
        description: a.about,
        photoUrl: "",
        emoji: a.emoji,
        bg: a.bg || "var(--amber-soft)",
        tags: a.tags,
        location: a.shelter,
        postedBy: a.shelter,
        posterId: 1,
        status: "available",
        breed: a.size,
        sex: a.sex,
        health: a.health
      })));
    } finally {
      setLoadingAnimals(false);
    }
  };

  const loadMeetings = async () => {
    if (!user) return;
    setLoadingMeetings(true);
    try {
      const list = await getAdoptionMeetings();
      setMeetings(list);
    } catch (err) {
      console.error("Failed to load meetings:", err);
    } finally {
      setLoadingMeetings(false);
    }
  };

  useEffect(() => {
    loadAnimals();
    loadMeetings();
  }, [user]);

  const closeDetail = () => {
    setOpenIndex(null);
    setMeeting(false);
    setSlot(null);
    setDone(false);
  };

  const handleRequestMeeting = async (animal) => {
    if (!user) {
      toast("Please log in to request an adoption meeting.");
      return;
    }
    if (!slot) return;

    try {
      await createAdoptionMeeting({
        petId: animal.id,
        petName: animal.petName,
        shelterId: animal.posterId || 1,
        slot,
      });
      toast(`Meeting requested with ${animal.petName}! 🐾`);
      setDone(true);
      loadMeetings();
    } catch (err) {
      toast(err.message || "Failed to schedule meeting");
    }
  };

  const handleUpdateMeetingStatus = async (meetingId, nextStatus) => {
    try {
      await updateAdoptionMeeting(meetingId, nextStatus);
      toast(`Meeting marked as ${nextStatus}!`);
      loadMeetings();
    } catch (err) {
      toast(err.message || "Failed to update meeting");
    }
  };

  const handlePetPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setNewPetPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleAddPetSubmit = async (e) => {
    e.preventDefault();
    if (!newPetName.trim()) { toast("Please enter a pet name"); return; }
    if (!newPetDescription.trim() || newPetDescription.trim().length < 10) { toast("Description must be at least 10 characters"); return; }
    if (!newPetPhoto) { toast("Please upload a photo of the pet"); return; }

    setSubmittingPet(true);
    try {
      const tagsArray = newPetTags.split(",").map(t => t.trim()).filter(Boolean);
      const healthArray = newPetHealth.split(",").map(h => h.trim()).filter(Boolean);
      
      const petDetails = {
        petName: newPetName,
        species: newPetSpecies,
        breed: newPetBreed || newPetSize, // use size if breed empty
        age: newPetAge || "Young",
        description: newPetDescription,
        photoUrl: newPetPhoto,
        tags: tagsArray.length ? tagsArray : ["Cute", "Friendly"],
        location: user.location || "Kathmandu",
        // Custom extra details stored in DB compatible fields
        sex: newPetSex,
        health: JSON.stringify(healthArray),
      };

      await createAdoptableAnimal(petDetails);
      toast(`${newPetName} has been listed for adoption! ❤️`);
      setShowAddPetModal(false);
      // Reset form
      setNewPetName("");
      setNewPetBreed("");
      setNewPetAge("");
      setNewPetDescription("");
      setNewPetPhoto("");
      setNewPetTags("");
      setNewPetHealth("");
      loadAnimals();
    } catch (err) {
      toast(err.message || "Failed to create adoption post");
    } finally {
      setSubmittingPet(false);
    }
  };

  // Shelter Portal UI
  if (user?.role === "shelter") {
    return (
      <div style={fade}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h1 className="pp-h1" style={{ margin: 0 }}>Adoption Panel</h1>
          <button className="pp-btn pp-btn-amber" style={{ width: "auto", padding: "8px 14px", borderRadius: 12, fontSize: 13 }} onClick={() => setShowAddPetModal(true)}>
            <Plus size={16} /> Add Pet
          </button>
        </div>

        {/* Tab Selector */}
        <div className="pp-segment" style={{ marginBottom: 16 }}>
          <button className={"pp-seg" + (shelterTab === "animals" ? " on" : "")} onClick={() => setShelterTab("animals")}>Manage Animals</button>
          <button className={"pp-seg" + (shelterTab === "meetings" ? " on" : "")} onClick={() => setShelterTab("meetings")}>
            Visits {meetings.filter(m => m.status === "pending").length > 0 && `(${meetings.filter(m => m.status === "pending").length})`}
          </button>
        </div>

        {shelterTab === "animals" ? (
          <div>
            <p className="pp-sub" style={{ marginBottom: 14 }}>Animals currently listed by your shelter.</p>
            {loadingAnimals ? (
              <div style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>Loading listed pets...</div>
            ) : animals.filter(a => a.posterId === user.id).length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, border: "1.5px dashed var(--line)", borderRadius: 18, color: "var(--ink-soft)", background: "var(--surface)" }}>
                No pets listed yet. Click &quot;Add Pet&quot; to list your first adoptable animal!
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {animals.filter(a => a.posterId === user.id).map((animal) => (
                  <div key={animal.id} className="pp-adopt">
                    <div className="pp-adopt-img" style={{ background: animal.bg || "var(--bg)" }}>
                      {animal.photoUrl ? (
                        <img src={animal.photoUrl} alt={animal.petName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        animal.emoji || "🐾"
                      )}
                      <span className="pp-pill" style={{ position: "absolute", top: 8, left: 8, background: "rgba(255,255,255,0.9)", color: "var(--sage)", fontSize: 10, padding: "2px 6px" }}>
                        {animal.status}
                      </span>
                    </div>
                    <div style={{ padding: "10px 12px 13px" }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{animal.petName}</div>
                      <div className="pp-sub" style={{ fontSize: 11.5 }}>{animal.age} · {animal.species}</div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "7px 0" }}>
                        {animal.tags?.map((tag) => <span key={tag} className="pp-pill" style={{ background: "var(--bg)", color: "var(--ink-soft)", fontSize: 10 }}>{tag}</span>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="pp-sub" style={{ marginBottom: 14 }}>Visits and meetings requested by individuals.</p>
            {loadingMeetings ? (
              <div style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>Loading meetings...</div>
            ) : meetings.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, border: "1.5px dashed var(--line)", borderRadius: 18, color: "var(--ink-soft)", background: "var(--surface)" }}>
                No adoption meetings requested yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {meetings.map((meet) => (
                  <div key={meet.id} className="pp-card" style={{ display: "flex", flexDirection: "column", gap: 10, borderColor: meet.status === "pending" ? "var(--amber)" : "var(--line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="pp-fred" style={{ fontWeight: 800, fontSize: 15 }}>{meet.userName} &rarr; {meet.petName}</span>
                      <span className={"pp-pill " + meet.status} style={{
                        background: meet.status === "confirmed" ? "var(--sage-soft)" : meet.status === "completed" ? "var(--sky-soft)" : meet.status === "cancelled" ? "var(--sos-soft)" : "var(--amber-soft)",
                        color: meet.status === "confirmed" ? "var(--sage)" : meet.status === "completed" ? "var(--sky)" : meet.status === "cancelled" ? "var(--sos)" : "var(--amber-deep)",
                      }}>
                        {meet.status}
                      </span>
                    </div>

                    <div className="pp-sub" style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 3 }}>
                      <div><b>Slot Requested:</b> {meet.slot}</div>
                      <div><b>Contact:</b> {meet.userContact}</div>
                      <div style={{ fontSize: 11 }}>Requested on {new Date(meet.createdAt).toLocaleDateString()}</div>
                    </div>

                    {meet.status === "pending" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button className="pp-btn pp-btn-amber" style={{ padding: "10px 14px", fontSize: 13, flex: 1 }} onClick={() => handleUpdateMeetingStatus(meet.id, "confirmed")}>
                          Confirm Visit
                        </button>
                        <button className="pp-btn pp-btn-ghost" style={{ padding: "10px 14px", fontSize: 13, border: "1px solid var(--line)" }} onClick={() => handleUpdateMeetingStatus(meet.id, "cancelled")}>
                          Decline
                        </button>
                      </div>
                    )}

                    {meet.status === "confirmed" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button className="pp-btn pp-btn-sos" style={{ padding: "10px 14px", fontSize: 13, flex: 1, background: "var(--sage)", boxShadow: "none" }} onClick={() => handleUpdateMeetingStatus(meet.id, "completed")}>
                          Mark Completed
                        </button>
                        <button className="pp-btn pp-btn-ghost" style={{ padding: "10px 14px", fontSize: 13, border: "1px solid var(--line)" }} onClick={() => handleUpdateMeetingStatus(meet.id, "cancelled")}>
                          Cancel Visit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Pet Modal (Custom Overlaid Sheet for high quality style) */}
        {showAddPetModal && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div className="pp-scroll" style={{ background: "var(--surface)", borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: "85%", padding: 20, animation: "rise .3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 className="pp-h2" style={{ margin: 0, fontSize: 18 }}>Post Pet for Adoption</h2>
                <button className="pp-icobtn" aria-label="Close" onClick={() => setShowAddPetModal(false)}><X size={18} /></button>
              </div>

              <form onSubmit={handleAddPetSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>PET PHOTO</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                    <button type="button" className={"pp-photoslot" + (newPetPhoto ? " filled" : "")} onClick={() => petFileRef.current?.click()} style={{ height: 120 }}>
                      {newPetPhoto ? (
                        <img src={newPetPhoto} alt="Pet preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} />
                      ) : (
                        <><Camera size={24} /><span style={{ fontSize: 12, fontWeight: 800 }}>Upload Photo</span></>
                      )}
                    </button>
                    <input ref={petFileRef} type="file" accept="image/*" hidden onChange={handlePetPhotoChange} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>NAME</label>
                    <input type="text" className="pp-chip" style={{ width: "100%", borderRadius: 12, padding: 10 }} placeholder="e.g. Daisy" value={newPetName} onChange={e => setNewPetName(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>SPECIES</label>
                    <select className="pp-chip" style={{ width: "100%", borderRadius: 12, padding: 10, background: "none" }} value={newPetSpecies} onChange={e => setNewPetSpecies(e.target.value)}>
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>BREED / SIZE</label>
                    <input type="text" className="pp-chip" style={{ width: "100%", borderRadius: 12, padding: 10 }} placeholder="e.g. Shiba Mix" value={newPetBreed} onChange={e => setNewPetBreed(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>AGE GROUP</label>
                    <input type="text" className="pp-chip" style={{ width: "100%", borderRadius: 12, padding: 10 }} placeholder="e.g. Puppy · 4 months" value={newPetAge} onChange={e => setNewPetAge(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>SEX</label>
                    <select className="pp-chip" style={{ width: "100%", borderRadius: 12, padding: 10, background: "none" }} value={newPetSex} onChange={e => setNewPetSex(e.target.value)}>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>SIZE CLASS</label>
                    <select className="pp-chip" style={{ width: "100%", borderRadius: 12, padding: 10, background: "none" }} value={newPetSize} onChange={e => setNewPetSize(e.target.value)}>
                      <option value="Small">Small</option>
                      <option value="Medium">Medium</option>
                      <option value="Large">Large</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>DESCRIPTION</label>
                  <textarea className="pp-chip" style={{ width: "100%", borderRadius: 12, padding: 10, height: 80, resize: "none" }} placeholder="Describe the pet's temperament, story, and habits..." value={newPetDescription} onChange={e => setNewPetDescription(e.target.value)} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>TAGS (comma-separated)</label>
                    <input type="text" className="pp-chip" style={{ width: "100%", borderRadius: 12, padding: 10 }} placeholder="Gentle, Friendly" value={newPetTags} onChange={e => setNewPetTags(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>HEALTH CARE (comma-separated)</label>
                    <input type="text" className="pp-chip" style={{ width: "100%", borderRadius: 12, padding: 10 }} placeholder="Vaccinated, Neutered" value={newPetHealth} onChange={e => setNewPetHealth(e.target.value)} />
                  </div>
                </div>

                <button type="submit" className="pp-btn pp-btn-amber" style={{ marginTop: 10 }} disabled={submittingPet}>
                  {submittingPet ? "Posting..." : "Publish Listing"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Individual Portal View (Standard User)
  if (openIndex !== null) {
    const animal = animals[openIndex];
    if (!animal) return null;

    const existingMeeting = meetings.find(m => m.petId === animal.id);

    if (done || existingMeeting) {
      const activeSlot = slot || existingMeeting?.slot;
      const activeStatus = existingMeeting?.status || "pending";

      return (
        <div style={fade}>
          <button className="pp-icobtn" aria-label="Back to adoptions" onClick={closeDetail} style={{ marginBottom: 14 }}><X size={18} /></button>
          <div className="pp-result" style={{ background: activeStatus === "confirmed" ? "linear-gradient(135deg,#48B08F,var(--sage))" : "linear-gradient(135deg,#FF9270,var(--coral))" }}>
            <Check size={30} />
            <div className="pp-fred" style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>
              {activeStatus === "confirmed" ? "Confirmed by Shelter! 🎉" : "Meeting requested 🐾"}
            </div>
            <div style={{ fontSize: 13.5, opacity: .95, marginTop: 4 }}>
              {animal.location || "The shelter"} {activeStatus === "confirmed" ? "has confirmed" : "will confirm"} your visit with {animal.petName} for <b>{activeSlot}</b>. You'll get a reminder and the shelter address here.
            </div>
          </div>
          <button className="pp-btn pp-btn-ghost" style={{ marginTop: 14 }} onClick={closeDetail}>Back to adoptions</button>
        </div>
      );
    }

    // Parse health items
    let healthArray = [];
    if (Array.isArray(animal.health)) {
      healthArray = animal.health;
    } else if (typeof animal.health === "string") {
      try {
        healthArray = JSON.parse(animal.health);
      } catch {
        healthArray = [animal.health];
      }
    }

    return (
      <div style={fade}>
        <button className="pp-icobtn" aria-label="Back to adoptions" onClick={closeDetail} style={{ marginBottom: 12 }}>
          <ChevronRight size={18} style={{ transform: "rotate(180deg)" }} />
        </button>

        <div style={{ borderRadius: 22, height: 168, display: "grid", placeItems: "center", fontSize: 84, background: animal.bg || "var(--bg)", position: "relative", overflow: "hidden" }}>
          {animal.photoUrl ? (
            <img src={animal.photoUrl} alt={animal.petName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            animal.emoji || "🐾"
          )}
          <button className="pp-fav" aria-label={`Favorite ${animal.petName}`} onClick={() => toggleFavorite(animal.id)} style={{ top: 12, right: 12 }}>
            <Heart size={18} fill={favorites[animal.id] ? "var(--coral)" : "none"} />
          </button>
        </div>

        <h1 className="pp-h1" style={{ marginTop: 14 }}>{animal.petName}</h1>
        <div className="pp-sub" style={{ fontSize: 13 }}>{animal.age} · {animal.sex || "Unknown"} · {animal.breed || "Medium"}</div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0 4px" }}>
          {animal.tags?.map((tag) => <span key={tag} className="pp-pill" style={{ background: "var(--coral-soft)", color: "var(--coral)" }}>{tag}</span>)}
        </div>

        <h2 className="pp-h2" style={{ marginTop: 16, marginBottom: 6 }}>About {animal.petName}</h2>
        <p className="pp-sub" style={{ fontSize: 13.5 }}>{animal.description}</p>

        {healthArray.length > 0 && (
          <>
            <h2 className="pp-h2" style={{ marginTop: 16, marginBottom: 8 }}>Health &amp; care</h2>
            {healthArray.map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--sage-soft)", display: "grid", placeItems: "center", flexShrink: 0 }}><Check size={13} color="var(--sage)" /></span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{item}</span>
              </div>
            ))}
          </>
        )}

        <div className="pp-listcard" style={{ marginTop: 14 }}>
          <div className="pp-thumb" style={{ background: "var(--bg)", color: "var(--sage)" }}><Building2 size={22} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{animal.location || " Kathmandu Rescuer"}</div>
            <div className="pp-sub" style={{ fontSize: 12 }}>Foster &amp; adoption · response within a day</div>
          </div>
        </div>

        {!meeting ? (
          <button className="pp-btn pp-btn-amber" style={{ marginTop: 16 }} onClick={() => setMeeting(true)}>
            <HeartHandshake size={18} /> I'm interested — arrange a meeting
          </button>
        ) : (
          <div style={{ marginTop: 16, ...fade }}>
            <div className="pp-fred" style={{ fontWeight: 600, marginBottom: 8 }}>Pick a time to meet {animal.petName}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {MEETING_SLOTS.map((meetingSlot) => (
                <button key={meetingSlot} className={"pp-chip" + (slot === meetingSlot ? " on" : "")} onClick={() => setSlot(meetingSlot)}>{meetingSlot}</button>
              ))}
            </div>
            <button className="pp-btn pp-btn-amber" style={{ marginTop: 14, opacity: slot ? 1 : .5 }} disabled={!slot} onClick={() => handleRequestMeeting(animal)}>
              Request meeting
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={fade}>
      <h1 className="pp-h1">Find a forever friend</h1>
      <div className="pp-card" style={{ marginTop: 12, marginBottom: 14, display: "flex", gap: 11, alignItems: "center", background: "var(--coral-soft)", borderColor: "var(--coral-soft)" }}>
        <ShieldCheck size={24} color="var(--coral)" style={{ flexShrink: 0 }} />
        <div className="pp-sub" style={{ fontSize: 12.5, color: "var(--ink)" }}>
          <b>Adopt, never buy.</b> Selling animals is not allowed on PawPin. Every listing comes from a shelter or foster.
        </div>
      </div>
      
      {loadingAnimals ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--ink-soft)" }}>Loading adoptable pets...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {animals.map((animal, index) => (
              <div key={animal.id} className="pp-adopt">
                <div className="pp-adopt-img" style={{ background: animal.bg || "var(--bg)" }}>
                  {animal.photoUrl ? (
                    <img src={animal.photoUrl} alt={animal.petName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    animal.emoji || "🐾"
                  )}
                  <button className="pp-fav" aria-label={`Favorite ${animal.petName}`} onClick={() => toggleFavorite(animal.id)}>
                    <Heart size={17} fill={favorites[animal.id] ? "var(--coral)" : "none"} />
                  </button>
                </div>
                <div style={{ padding: "10px 12px 13px" }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{animal.petName}</div>
                  <div className="pp-sub" style={{ fontSize: 11.5 }}>{animal.age}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "7px 0" }}>
                    {animal.tags?.map((tag) => <span key={tag} className="pp-pill" style={{ background: "var(--bg)", color: "var(--ink-soft)", fontSize: 10 }}>{tag}</span>)}
                  </div>
                  <button className="pp-btn pp-btn-ghost" style={{ padding: 9, fontSize: 12.5 }} onClick={() => setOpenIndex(index)}>Meet {animal.petName}</button>
                </div>
              </div>
            ))}
          </div>

          {/* Individual's requested meetings list */}
          {user && meetings.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h2 className="pp-h2" style={{ marginBottom: 10 }}>Your Scheduled Visits</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {meetings.map((meet) => (
                  <div key={meet.id} className="pp-listcard">
                    <div className="pp-thumb" style={{ background: "var(--coral-soft)", color: "var(--coral)", fontSize: 24 }}><Calendar size={22} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 13.5 }}>Visit with {meet.petName}</div>
                      <div className="pp-sub" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {meet.slot}
                      </div>
                    </div>
                    <span className="pp-pill" style={{
                      background: meet.status === "confirmed" ? "var(--sage-soft)" : meet.status === "completed" ? "var(--sky-soft)" : meet.status === "cancelled" ? "var(--sos-soft)" : "var(--amber-soft)",
                      color: meet.status === "confirmed" ? "var(--sage)" : meet.status === "completed" ? "var(--sky)" : meet.status === "cancelled" ? "var(--sos)" : "var(--amber-deep)",
                      fontSize: 10.5
                    }}>
                      {meet.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
