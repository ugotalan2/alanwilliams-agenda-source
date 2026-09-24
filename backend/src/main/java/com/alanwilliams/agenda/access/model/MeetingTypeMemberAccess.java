package com.alanwilliams.agenda.access.model;

import com.alanwilliams.agenda.access.MeetingPermissionRole;
import com.alanwilliams.agenda.meeting.MeetingType;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "meeting_type_member_access")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingTypeMemberAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meeting_type_id", nullable = false)
    private MeetingType meetingType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "organization_membership_id",
            nullable = false
    )
    private OrganizationMembership organizationMembership;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission_role", nullable = false, length = 20)
    private MeetingPermissionRole permissionRole;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public MeetingTypeMemberAccess(
            MeetingType meetingType,
            OrganizationMembership organizationMembership,
            MeetingPermissionRole permissionRole
    ) {
        Instant now = Instant.now();

        this.meetingType = meetingType;
        this.organizationMembership = organizationMembership;
        this.permissionRole = permissionRole;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void updatePermissionRole(
            MeetingPermissionRole permissionRole
    ) {
        this.permissionRole = permissionRole;
        this.updatedAt = Instant.now();
    }
}