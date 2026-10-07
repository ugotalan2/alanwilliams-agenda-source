package com.alanwilliams.agenda.prayer;

import com.alanwilliams.agenda.meeting.MeetingType;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Entity
@Table(name = "meeting_type_prayer_roll_entry")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingTypePrayerRollEntry {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "meeting_type_id")
  private MeetingType meetingType;

  @Column(nullable = false, length = 200)
  private String focus;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "created_by_membership_id")
  private OrganizationMembership createdByMembership;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public MeetingTypePrayerRollEntry(MeetingType mt, String focus, OrganizationMembership actor) {
    this.meetingType = mt;
    this.focus = focus;
    this.createdByMembership = actor;
    this.createdAt = Instant.now();
    this.updatedAt = createdAt;
  }

  public void rename(String focus) {
    this.focus = focus;
    this.updatedAt = Instant.now();
  }
}
