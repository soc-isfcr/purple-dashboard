import Enrollment from "../models/Enrollment.js";
import Certificate from "../models/Certificate.js";

export const userDashboard = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    console.log(`[Dashboard] Fetching dashboard for User: ${userId}`);

    // Fetch enrollments (ongoing/active and completed)
    const [enrollments, certs] = await Promise.all([
      Enrollment.find({
        userId,
        status: { $in: ["active", "ongoing", "completed"] }
      }).populate("courseId").lean(),

      Certificate.find({
        userId
      }).populate("courseId").lean(),
    ]);

    // Import progress updater
    const { updateCourseProgress } = await import("./progressController.js")

    // Process enrollments and sync progress
    const ongoing = [];
    const completed = [];

    for (const e of enrollments) {
      const actualCourseId = e.courseId?._id || e.courseId;
      if (!actualCourseId) continue;

      // Sync progress for ongoing courses to ensure accuracy
      let currentProgress = e.progress || 0;
      if (e.status !== "completed") {
        try {
          const p = await updateCourseProgress(userId, actualCourseId);
          currentProgress = p ? p.overallProgress : currentProgress;
        } catch (err) {
          console.warn(`[Dashboard] Failed to update progress for course ${actualCourseId}:`, err.message);
        }
      }

      // Calculate internal enrollment flag
      // -1: Not enrolled, 0: Ongoing, 1: Completed (Prog 100 + Cert)
      const hasCertificate = await Certificate.exists({
        $and: [
          { $or: [{ userId }, { user: userId }] },
          { $or: [{ courseId: actualCourseId }, { course: actualCourseId }] }
        ]
      });

      const enrollmentType = (currentProgress >= 100 && hasCertificate) ? 1 : 0;

      const courseData = e.courseId || {};
      const item = {
        id: e._id,
        courseId: actualCourseId,
        course: courseData.title || "Untitled",
        percentage: currentProgress,
        status: e.status,
        enrolledAt: e.enrolledAt,
        enrollmentType: enrollmentType // Internal flag for robust state management
      };

      if (e.status === "completed" || currentProgress >= 100) {
        item.completedAt = e.completedAt || new Date();
        item.status = "completed";
        completed.push(item);
      } else {
        ongoing.push(item);
      }
    }

    console.log(`[Dashboard] Stats for User ${userId} -> Enrolled: ${enrollments.length}, Ongoing: ${ongoing.length}, Completed: ${completed.length}, Certs: ${certs.length}`);

    const dashboardData = {
      ongoing,
      completed,
      certificates: certs.map(c => ({
        id: c._id,
        certId: c.certificateId || c.certId,
        course: (c.courseId?.title || "Untitled"),
        issuedAt: c.issuedDate || c.issuedAt || null,
      })),
    };

    const { sendResponse } = await import("../utils/response.js");
    return sendResponse(res, 200, "User dashboard data fetched successfully", dashboardData);
  } catch (error) {
    console.error("[Dashboard] Error in userDashboard:", error);
    next(error);
  }
};
